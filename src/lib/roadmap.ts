import { prisma } from "@/lib/prisma";
import {
  diasHabilesEntre,
  finDeSemanaHabil,
  hoyUTC,
  semanaDe,
  semanasEntre,
  siguienteDiaHabil,
  sumarSemanas,
} from "@/lib/dias-habiles";
import { SOLO_TAREAS_VIVAS, listasVivas } from "@/lib/roadmap-papelera";
import type { Cliente, Prisma } from "@/generated/prisma/client";

// Cliente de Prisma o cliente de transacción. Las funciones que leen y
// reescriben la secuencia lo reciben para poder correr dentro de la misma
// transacción que la escritura que las disparó: borrar una tarea y
// reencadenar las fechas son un solo hecho, y a mitad de camino el plan queda
// con las fechas viejas de las tareas que siguen.
export type DB = Prisma.TransactionClient;

// ── Plantillas por defecto ────────────────────────────────────────────────
// Fuente: "Tareas CORE.xlsx" (una solapa por plantilla, una fila por tarea).
//
// Solo el nombre y las horas estimadas. El Excel traía además fechas, de las
// que se derivaba una duración en días hábiles por tarea; eso desapareció al
// pasar a semanas: toda tarea ocupa una semana, así que no hay duración que
// derivar. Un plan de 2026 tampoco servía para un cliente que arranca en 2027.
//
// Las plantillas viven en código, no en una tabla: son una sugerencia de
// proceso de trabajo, y en cuanto se copian a un proyecto las listas pasan a
// ser propias de ese proyecto y evolucionan por su cuenta.

type FilaXlsx = [nombre: string, horas: number];

const ONBOARDING_XLSX: FilaXlsx[] = [
  ["Kick off cliente", 1],
  ["Reuniones 1:1", 6],
  ["Entrega de Diagnóstico", 2],
  ["Workshop 1 - OKRs", 6],
  ["Workshop 2 - Mapeo de Negocio", 6],
  ["Workshop 3 - Foco, Agilidad, Ejecución", 6],
  ["Workshop 4 - Lanzamiento de Tablero", 6],
  // Hito sin estimación en el Excel: entra con 0 horas de presupuesto.
  ["Go Live - Lanzamiento Tablero OKR", 0],
];

const TABLERO_XLSX: FilaXlsx[] = [
  ["Dinámica de Iniciativas", 6],
  ["Primera Quincenal", 1.5],
  ["Office Hours", 1.5],
  ["Primera Mensual", 1.5],
  ["Office Hours", 1.5],
  ["Segunda Quincenal", 1.5],
  ["Office Hours", 1.5],
  ["Segunda Mensual", 1.5],
  ["Office Hours", 1.5],
  ["Tercera Quincenal", 1.5],
  ["Office Hours", 1.5],
  ["Tercera Mensual y Cierre Q", 1.5],
  ["Retrospectiva del trimestre", 6],
];

export type TareaPlantilla = {
  nombre: string;
  horasEstimadas: number;
};

export type Plantilla = { nombre: string; tareas: TareaPlantilla[] };

function desdeXlsx(filas: FilaXlsx[]): TareaPlantilla[] {
  return filas.map(([nombre, horas]) => ({ nombre, horasEstimadas: horas }));
}

export const PLANTILLA_ONBOARDING: Plantilla = {
  nombre: "Onboarding",
  tareas: desdeXlsx(ONBOARDING_XLSX),
};

// El nombre lleva el número de trimestre al instanciarse (Tablero Q1, Q2, …).
export const PLANTILLA_TABLERO: Plantilla = {
  nombre: "Tablero Trimestral",
  tareas: desdeXlsx(TABLERO_XLSX),
};

// Opciones que se ofrecen al agregar una lista nueva a un proyecto.
export const PLANTILLAS: Plantilla[] = [PLANTILLA_ONBOARDING, PLANTILLA_TABLERO];

// Un tablero trimestral por cada trimestre contratado, redondeando para
// arriba: 10 meses son 4 tableros (el último, parcial).
export function cantidadTrimestres(duracionMeses: number | null): number {
  if (!duracionMeses || duracionMeses < 1) return 1;
  return Math.max(1, Math.ceil(duracionMeses / 3));
}

// Plan sugerido para un proyecto: Onboarding + un tablero por trimestre.
export function listasPorDefecto(duracionMeses: number | null): Plantilla[] {
  return [
    PLANTILLA_ONBOARDING,
    ...Array.from({ length: cantidadTrimestres(duracionMeses) }, (_, i) => ({
      nombre: `Tablero Q${i + 1}`,
      tareas: PLANTILLA_TABLERO.tareas,
    })),
  ];
}

// ── Planificación secuencial ──────────────────────────────────────────────

export type TareaPlanificable = {
  // Las fechas que la tarea tiene HOY. Son opcionales porque quien planifica
  // desde cero -el sembrado del roadmap- todavía no las tiene; cuando están,
  // son las que dan la relación temporal a conservar dentro de un grupo.
  fechaInicio?: Date;
  fechaFin?: Date;
  // Grupo al que pertenece, si pertenece a alguno. Es una marca explícita que
  // pone una persona desde la barra de selección: coincidir de fechas NO
  // agrupa, ni arrastrando, ni desde el calendario, ni por un recálculo.
  grupoId?: string | null;
};

// ── El scheduler ──────────────────────────────────────────────────────────
//
// UNA tarea, UNA semana hábil: lunes a viernes. La siguiente arranca el lunes
// de la semana posterior.
//
// Antes cada tarea arrancaba el día hábil siguiente al fin de la anterior y
// duraba lo que dijera `duracionDias`. Con eso, una lista de trece tareas
// cortas entraba en tres semanas: el plan quedaba comprimido y no se parecía
// al ritmo real de trabajo, que es una reunión o un entregable por semana.
//
// Esta función es el ÚNICO lugar donde se deciden fechas del Roadmap. La usan
// el sembrado de plantillas, el alta y la baja de tareas, el reordenamiento
// por drag & drop y el calendario. Si mañana la regla cambia, cambia acá y en
// ningún otro lado.
//
// Dos cosas se respetan por encima de la grilla semanal:
//
//   · El ANCLA, cuando el llamador pide conservarla. Es la tarea que una
//     persona acaba de mover con el calendario: sus fechas son una decisión,
//     no un cálculo, y aunque empiece un miércoles se quedan como están. Lo
//     que se recalcula es lo que viene después.
//
//   · Los GRUPOS. Las tareas que alguien agrupó explícitamente se mueven como
//     una unidad y conservan su separación EN SEMANAS. Cada miembro se ancla
//     al primero del grupo y no a su vecino, que es lo que hace que el grupo
//     aguante que le metan una tarea suelta en el medio al reordenar. La tarea
//     que sigue a un grupo arranca después de la semana MÁS TARDÍA del grupo,
//     no de la del último en orden.
export function planificar(
  tareas: TareaPlanificable[],
  desde: number,
  inicioDesde: Date,
  { conservarAncla = false }: { conservarAncla?: boolean } = {},
): Programada[] {
  const plan: Programada[] = [];
  // La semana más tardía ya ocupada, como milisegundos de su lunes. Con grupos
  // deja de ser la de la tarea anterior en orden.
  let ultimaSemanaMs = 0;

  // En qué semana arranca cada grupo, antes y después de replanificar. Con las
  // dos se traslada la separación original al lugar nuevo.
  const anclaDeGrupo = new Map<string, { vieja: Date; nueva: Date }>();
  const recordarAncla = (t: TareaPlanificable, semanaNueva: Date) => {
    if (!t.grupoId || !t.fechaInicio || anclaDeGrupo.has(t.grupoId)) return;
    anclaDeGrupo.set(t.grupoId, { vieja: semanaDe(t.fechaInicio), nueva: semanaNueva });
  };

  const ocupar = (semana: Date) => {
    ultimaSemanaMs = Math.max(ultimaSemanaMs, semana.getTime());
  };

  // Las tareas anteriores al ancla no se replanifican, pero sí pueden ser el
  // primer miembro de un grupo que sigue más adelante, y sí ocupan su semana.
  for (let i = 0; i < desde; i++) {
    const t = tareas[i];
    if (t.fechaInicio) recordarAncla(t, semanaDe(t.fechaInicio));
    if (t.fechaFin) ocupar(semanaDe(t.fechaFin));
  }

  for (let i = desde; i < tareas.length; i++) {
    const t = tareas[i];

    // El ancla conservada no se toca: se copia tal cual y solo aporta su
    // semana a la cuenta, para que la siguiente sepa dónde arrancar.
    if (i === desde && conservarAncla && t.fechaInicio && t.fechaFin) {
      plan.push({
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        duracionDias: Math.max(1, diasHabilesEntre(t.fechaInicio, t.fechaFin)),
      });
      recordarAncla(t, semanaDe(t.fechaInicio));
      ocupar(semanaDe(t.fechaFin));
      continue;
    }

    let semana: Date;
    const ancla = t.grupoId ? anclaDeGrupo.get(t.grupoId) : undefined;
    if (i === desde) {
      semana = semanaDe(inicioDesde);
    } else if (ancla && t.fechaInicio) {
      semana = sumarSemanas(
        ancla.nueva,
        semanasEntre(ancla.vieja, semanaDe(t.fechaInicio)),
      );
    } else {
      semana = ultimaSemanaMs
        ? sumarSemanas(new Date(ultimaSemanaMs), 1)
        : semanaDe(inicioDesde);
    }

    const fin = finDeSemanaHabil(semana);
    plan.push({ fechaInicio: semana, fechaFin: fin, duracionDias: 5 });
    recordarAncla(t, semana);
    ocupar(semana);
  }
  return plan;
}

// ── Persistencia ──────────────────────────────────────────────────────────

// Todas las tareas del proyecto en el orden en que se ejecutan: por lista y,
// dentro de cada lista, por orden. Esa secuencia única es la cadena de
// dependencias del roadmap.
export async function getTareasEnOrden(clienteId: string, db: DB = prisma) {
  // Sin lo que está en la papelera: una tarea eliminada no ocupa lugar en la
  // secuencia, así que las que siguen se corren para ocupar su hueco.
  const listas = await db.listaRoadmap.findMany({
    where: listasVivas({ clienteId }),
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: {
      tareas: {
        where: SOLO_TAREAS_VIVAS,
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  return listas.flatMap((l) => l.tareas);
}

// Reencadena las fechas del proyecto a partir de una tarea. Si `anclaId` no se
// pasa (o ya no existe), se replanifica todo desde el arranque del proyecto.
// Solo escribe las filas cuya fecha efectivamente cambió.
// Calcula el reencadenado SIN escribir: devuelve solo las filas cuya fecha
// cambia. Separar el cálculo de la escritura es lo que permite mandar todas
// las actualizaciones en un solo viaje a la base.
//
// Importa más de lo que parece: contra una base remota cada UPDATE cuesta un
// ida y vuelta, así que escribir 13 fechas de a una tardaba casi un segundo
// mientras que las mismas 13 en un lote tardan 67 ms.
export async function calcularSecuencia(
  clienteId: string,
  anclaId?: string,
  inicioForzado?: Date,
  db: DB = prisma,
): Promise<CambioDeFecha[]> {
  const tareas = await getTareasEnOrden(clienteId, db);
  if (tareas.length === 0) return [];

  const indice = anclaId ? tareas.findIndex((t) => t.id === anclaId) : -1;
  const desde = indice >= 0 ? indice : 0;
  const inicio =
    inicioForzado ??
    (indice >= 0 ? tareas[desde].fechaInicio : await inicioProyecto(clienteId, db));

  const plan = planificar(tareas, desde, inicio, {
    conservarAncla: indice >= 0 && !inicioForzado,
  });

  return plan.flatMap((p, i) => cambioDeFecha(tareas[desde + i], p));
}

export type CambioDeFecha = {
  id: string;
  fechaInicio: Date;
  fechaFin: Date;
  duracionDias: number;
};

export type Programada = {
  fechaInicio: Date;
  fechaFin: Date;
  duracionDias: number;
};

// Una tarea entra en el lote de escritura solo si algo cambió. Sin esto, cada
// recálculo reescribía las mismas fechas en todas las filas.
export function cambioDeFecha(
  tarea: { id: string } & Programada,
  p: Programada,
): CambioDeFecha[] {
  const igual =
    tarea.fechaInicio.getTime() === p.fechaInicio.getTime() &&
    tarea.fechaFin.getTime() === p.fechaFin.getTime() &&
    tarea.duracionDias === p.duracionDias;
  return igual ? [] : [{ id: tarea.id, ...p }];
}

// Las escrituras del reencadenado como operaciones sueltas, para que el
// llamador las mande junto con las suyas en un único $transaction([...]).
export function escriturasDeSecuencia(cambios: CambioDeFecha[]) {
  return cambios.map((c) =>
    prisma.tareaRoadmap.update({
      where: { id: c.id },
      data: {
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        duracionDias: c.duracionDias,
      },
    }),
  );
}

// Devuelve los ids de las tareas cuyas fechas cambiaron. Quien reprograma
// necesita saberlo para resaltarlas y avisar cuántas fueron: sin ese dato,
// correr veinte fechas de golpe se ve igual que no hacer nada.
export async function resecuenciar(
  clienteId: string,
  anclaId?: string,
  inicioForzado?: Date,
  db: DB = prisma,
): Promise<string[]> {
  const tareas = await getTareasEnOrden(clienteId, db);
  if (tareas.length === 0) return [];

  const indice = anclaId ? tareas.findIndex((t) => t.id === anclaId) : -1;
  const desde = indice >= 0 ? indice : 0;
  const inicio =
    inicioForzado ??
    (indice >= 0 ? tareas[desde].fechaInicio : await inicioProyecto(clienteId, db));

  const plan = planificar(tareas, desde, inicio, {
    conservarAncla: indice >= 0 && !inicioForzado,
  });

  // En serie sobre `db` y no en un $transaction propio: cuando esto corre
  // dentro de una transacción abrir otra no está permitido, y cuando corre
  // suelto el llamador ya decidió que no la necesita.
  const cambiadas: string[] = [];
  for (const [i, p] of plan.entries()) {
    const [c] = cambioDeFecha(tareas[desde + i], p);
    if (!c) continue;
    cambiadas.push(c.id);
    await db.tareaRoadmap.update({
      where: { id: c.id },
      data: {
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        duracionDias: c.duracionDias,
      },
    });
  }
  return cambiadas;
}

// Arranque del plan: la fecha de inicio del contrato si está cargada; si no,
// el próximo día hábil.
async function inicioProyecto(clienteId: string, db: DB = prisma): Promise<Date> {
  const cliente = await db.cliente.findUnique({
    where: { id: clienteId },
    select: { fechaInicio: true },
  });
  return siguienteDiaHabil(cliente?.fechaInicio ?? hoyUTC());
}

// Crea el plan por defecto la primera vez que se entra al Roadmap de un
// proyecto. `roadmapCreadoEn` es la marca que lo hace idempotente: una vez
// sembrado no se vuelve a tocar, así borrar todas las listas es una decisión
// que se respeta en lugar de deshacerse sola en la próxima visita.
export async function asegurarRoadmap(
  cliente: Pick<
    Cliente,
    "id" | "activo" | "duracionMeses" | "fechaInicio" | "roadmapCreadoEn"
  >,
): Promise<void> {
  if (cliente.roadmapCreadoEn) return;
  // Un cliente inactivo no recibe carga de datos, y sembrar el plan sugerido es
  // crear listas y tareas. Sin esto, abrir por primera vez el Follow Up de un
  // proyecto apagado le escribía un roadmap entero solo por mirarlo. Queda un
  // plan vacío, que es la respuesta correcta: no hay plan de trabajo para un
  // proyecto que no opera.
  if (!cliente.activo) return;

  const plantillas = listasPorDefecto(cliente.duracionMeses);
  const arranque = siguienteDiaHabil(cliente.fechaInicio ?? hoyUTC());

  // Las fechas se calculan de una sola pasada sobre la secuencia completa
  // (todas las listas encadenadas), no lista por lista.
  // Al scheduler solo le importa CUÁNTAS tareas hay y en qué orden: una
  // plantilla no trae fechas ni grupos, así que se le pasan tareas vacías.
  const todas = plantillas.flatMap((p) => p.tareas);
  const plan = planificar(todas.map(() => ({})), 0, arranque);

  let global = 0;
  await prisma.$transaction(async (tx) => {
    // Relectura dentro de la transacción: si dos pestañas abren el Roadmap a
    // la vez, la segunda encuentra la marca ya puesta y no duplica el plan.
    const actual = await tx.cliente.findUnique({
      where: { id: cliente.id },
      select: { roadmapCreadoEn: true },
    });
    if (actual?.roadmapCreadoEn) return;

    for (const [i, plantilla] of plantillas.entries()) {
      const lista = await tx.listaRoadmap.create({
        data: { clienteId: cliente.id, nombre: plantilla.nombre, orden: i },
      });
      await tx.tareaRoadmap.createMany({
        data: plantilla.tareas.map((t, j) => ({
          listaId: lista.id,
          nombre: t.nombre,
          orden: j,
          horasEstimadas: t.horasEstimadas,
          duracionDias: plan[global + j].duracionDias,
          fechaInicio: plan[global + j].fechaInicio,
          fechaFin: plan[global + j].fechaFin,
        })),
      });
      global += plantilla.tareas.length;
    }

    await tx.cliente.update({
      where: { id: cliente.id },
      data: { roadmapCreadoEn: new Date() },
    });
  });
}
