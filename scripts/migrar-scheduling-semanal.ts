import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { planificar } from "../src/lib/roadmap";
import { SOLO_TAREAS_VIVAS, listasVivas } from "../src/lib/roadmap-papelera";
import { isoDesdeFecha, semanaDe } from "../src/lib/dias-habiles";

// Normaliza las listas existentes a la regla nueva: una tarea, una semana
// hábil (lunes a viernes).
//
// Usa el MISMO scheduler que la aplicación -`planificar`-, no una copia. Si la
// regla cambia, esta migración cambia con ella sin que nadie se acuerde de
// tocarla.
//
// Es idempotente: corrida dos veces seguidas, la segunda no escribe nada. Lo
// garantiza el propio scheduler, que es una función pura de la lista de tareas
// y su arranque; si las fechas ya son las que corresponden, no hay diferencia
// que aplicar.
//
// Por defecto NO escribe. Audita, muestra el antes y el después y termina.
// Para aplicar hay que pasar --aplicar explícitamente.
//
//   npx tsx scripts/migrar-scheduling-semanal.ts             (auditoría)
//   npx tsx scripts/migrar-scheduling-semanal.ts --aplicar   (escribe)
//   npx tsx scripts/migrar-scheduling-semanal.ts --cliente=<id>

const APLICAR = process.argv.includes("--aplicar");
const SOLO_CLIENTE = process.argv
  .find((a) => a.startsWith("--cliente="))
  ?.slice("--cliente=".length);

// Estados cuyas fechas son historia y no se tocan. Una tarea finalizada o no
// ejecutada ya ocurrió: reprogramarla sería reescribir el pasado.
const HISTORICOS = new Set(["finalizada", "no_ejecutada"]);

type TareaDB = {
  id: string;
  nombre: string;
  estado: string;
  grupoId: string | null;
  orden: number;
  fechaInicio: Date;
  fechaFin: Date;
  duracionDias: number;
  horasEstimadas: unknown;
  personas: number;
};

function iso(d: Date) {
  return isoDesdeFecha(d);
}

async function main() {
  const clientes = await prisma.cliente.findMany({
    where: SOLO_CLIENTE ? { id: SOLO_CLIENTE } : {},
    select: { id: true, nombre: true, fechaInicio: true },
    orderBy: { nombre: "asc" },
  });

  let listasTotales = 0;
  let tareasTotales = 0;
  let tareasHistoricas = 0;
  let tareasACambiar = 0;
  const clientesTocados: string[] = [];

  for (const cliente of clientes) {
    // Las tareas del cliente en el orden en que se ejecutan: por lista y,
    // dentro de cada lista, por orden. Es la misma consulta que usa la app.
    const listas = await prisma.listaRoadmap.findMany({
      where: listasVivas({ clienteId: cliente.id }),
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: {
        tareas: {
          where: SOLO_TAREAS_VIVAS,
          orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    const tareas = listas.flatMap((l) => l.tareas) as unknown as TareaDB[];
    listasTotales += listas.length;
    tareasTotales += tareas.length;
    if (tareas.length === 0) continue;

    // Desde la primera tarea pendiente o en curso hacia adelante. Todo lo
    // anterior es histórico y conserva sus fechas.
    const primeraPendiente = tareas.findIndex((t) => !HISTORICOS.has(t.estado));
    tareasHistoricas += primeraPendiente < 0 ? tareas.length : primeraPendiente;
    if (primeraPendiente < 0) continue;

    // El arranque: la semana en la que la primera pendiente YA está.
    //
    // Nada se mueve hacia atrás. La migración descomprime el plan hacia
    // adelante -que es lo que la regla vieja apretaba- y no lo reubica: sin
    // esto, una lista cuyo arranque quedó atrás terminaba reprogramada en el
    // arranque del contrato, dos meses antes de donde estaba. Medido en la
    // auditoría: Santoni se iba del 04/08 al 29/06.
    //
    // Con un piso: la semana siguiente a la última tarea histórica, para que
    // lo pendiente no se superponga con lo que ya ocurrió.
    const ultimaHistorica = tareas
      .slice(0, primeraPendiente)
      .reduce<Date | null>((max, t) => (!max || t.fechaFin > max ? t.fechaFin : max), null);
    const propia = semanaDe(tareas[primeraPendiente].fechaInicio);
    const piso = ultimaHistorica
      ? new Date(semanaDe(ultimaHistorica).getTime() + 7 * 24 * 3600 * 1000)
      : null;
    const arranque = piso && piso > propia ? piso : propia;

    // `conservarAncla: false` a propósito: la primera pendiente también se
    // normaliza a su semana. La migración es exactamente eso.
    const plan = planificar(tareas, primeraPendiente, arranque);

    const cambios = plan.flatMap((p, i) => {
      const t = tareas[primeraPendiente + i];
      const igual =
        t.fechaInicio.getTime() === p.fechaInicio.getTime() &&
        t.fechaFin.getTime() === p.fechaFin.getTime() &&
        t.duracionDias === p.duracionDias;
      return igual ? [] : [{ id: t.id, ...p }];
    });

    if (cambios.length > 0) {
      clientesTocados.push(cliente.nombre);
      tareasACambiar += cambios.length;
    }

    console.log(
      `${cliente.nombre.padEnd(26)} listas=${String(listas.length).padStart(2)}  tareas=${String(tareas.length).padStart(3)}  historicas=${String(primeraPendiente).padStart(3)}  a cambiar=${String(cambios.length).padStart(3)}`,
    );
    for (const c of cambios.slice(0, 4)) {
      const t = tareas.find((x) => x.id === c.id)!;
      console.log(
        `    ${t.nombre.slice(0, 38).padEnd(38)} ${iso(t.fechaInicio)}→${iso(t.fechaFin)}  ⇒  ${iso(c.fechaInicio)}→${iso(c.fechaFin)}`,
      );
    }
    if (cambios.length > 4) console.log(`    … y ${cambios.length - 4} más`);

    if (APLICAR && cambios.length > 0) {
      // Transaccional por cliente: el plan de un proyecto se reescribe entero
      // o no se reescribe. A mitad de camino quedaría una secuencia mezclada.
      await prisma.$transaction(
        cambios.map((c) =>
          prisma.tareaRoadmap.update({
            where: { id: c.id },
            // Solo fechas y duración. Estado, horas, personas, grupo, nombre y
            // orden no se tocan: la migración reprograma, no reescribe.
            data: {
              fechaInicio: c.fechaInicio,
              fechaFin: c.fechaFin,
              duracionDias: c.duracionDias,
            },
          }),
        ),
      );
    }
  }

  console.log("\n" + "─".repeat(72));
  console.log(`clientes:            ${clientes.length}`);
  console.log(`listas:              ${listasTotales}`);
  console.log(`tareas vivas:        ${tareasTotales}`);
  console.log(`  historicas (intactas): ${tareasHistoricas}`);
  console.log(`  a reprogramar:         ${tareasACambiar}`);
  console.log(`clientes afectados:  ${clientesTocados.length}`);
  console.log(
    APLICAR
      ? "\nAPLICADO."
      : "\nSolo auditoría: no se escribió nada. Volvé a correr con --aplicar.",
  );
  await prisma.$disconnect();
}

main();
