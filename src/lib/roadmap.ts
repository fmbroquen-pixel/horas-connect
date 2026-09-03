import { prisma } from "@/lib/prisma";
import {
  DIA_MS,
  diasHabilesEntre,
  esDiaHabil,
  fechaDesdeISO,
  finTrasDiasHabiles,
  hoyUTC,
  siguienteDiaHabil,
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
// Las fechas del Excel se conservan solo como referencia para DERIVAR la
// duración en días hábiles de cada tarea; al aplicar la plantilla a un
// proyecto las fechas reales se recalculan desde el arranque de ese proyecto.
// Por eso no se guardan en la base: un plan de 2026 no sirve para un cliente
// que arranca en 2027, pero "esta tarea dura 3 días hábiles" sí.
//
// Las plantillas viven en código, no en una tabla: son una sugerencia de
// proceso de trabajo, y en cuanto se copian a un proyecto las listas pasan a
// ser propias de ese proyecto y evolucionan por su cuenta.

type FilaXlsx = [nombre: string, inicioISO: string, finISO: string, horas: number];

const ONBOARDING_XLSX: FilaXlsx[] = [
  ["Kick off cliente", "2026-08-08", "2026-08-12", 1],
  ["Reuniones 1:1", "2026-08-15", "2026-08-25", 6],
  ["Entrega de Diagnóstico", "2026-08-28", "2026-08-28", 2],
  ["Workshop 1 - OKRs", "2026-08-29", "2026-09-02", 6],
  ["Workshop 2 - Mapeo de Negocio", "2026-09-05", "2026-09-09", 6],
  ["Workshop 3 - Foco, Agilidad, Ejecución", "2026-09-12", "2026-09-16", 6],
  ["Workshop 4 - Lanzamiento de Tablero", "2026-09-19", "2026-09-23", 6],
  // Hito sin estimación en el Excel: entra con 0 horas de presupuesto.
  ["Go Live - Lanzamiento Tablero OKR", "2026-09-23", "2026-09-23", 0],
];

const TABLERO_XLSX: FilaXlsx[] = [
  ["Dinámica de Iniciativas", "2026-09-25", "2026-09-29", 6],
  ["Primera Quincenal", "2026-10-01", "2026-10-05", 1.5],
  ["Office Hours", "2026-10-08", "2026-10-12", 1.5],
  ["Primera Mensual", "2026-10-15", "2026-10-19", 1.5],
  ["Office Hours", "2026-10-22", "2026-10-26", 1.5],
  ["Segunda Quincenal", "2026-10-29", "2026-11-02", 1.5],
  ["Office Hours", "2026-11-05", "2026-11-09", 1.5],
  ["Segunda Mensual", "2026-11-12", "2026-11-16", 1.5],
  ["Office Hours", "2026-11-19", "2026-11-23", 1.5],
  ["Tercera Quincenal", "2026-11-26", "2026-11-30", 1.5],
  ["Office Hours", "2026-12-03", "2026-12-07", 1.5],
  ["Tercera Mensual y Cierre Q", "2026-12-10", "2026-12-14", 1.5],
  ["Retrospectiva del trimestre", "2026-12-17", "2026-12-21", 6],
];

export type TareaPlantilla = {
  nombre: string;
  duracionDias: number;
  horasEstimadas: number;
};

export type Plantilla = { nombre: string; tareas: TareaPlantilla[] };

function desdeXlsx(filas: FilaXlsx[]): TareaPlantilla[] {
  return filas.map(([nombre, inicioISO, finISO, horas]) => ({
    nombre,
    duracionDias: Math.max(
      1,
      diasHabilesEntre(fechaDesdeISO(inicioISO), fechaDesdeISO(finISO)),
    ),
    horasEstimadas: horas,
  }));
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
  duracionDias: number;
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

// Avanza `n` días hábiles desde una fecha. n = 0 devuelve el mismo día si es
// hábil, o el siguiente que lo sea.
function sumarDiasHabiles(desde: Date, n: number): Date {
  const cur = siguienteDiaHabil(desde);
  let restantes = Math.max(0, n);
  while (restantes > 0) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (esDiaHabil(cur)) restantes--;
  }
  return cur;
}

// Separación en días hábiles entre dos inicios. Nunca negativa: si el segundo
// arranca antes que el primero, se los toma como simultáneos en vez de
// inventar un offset hacia atrás que empujaría al grupo en cada recálculo.
function separacionHabil(desde: Date, hasta: Date): number {
  if (hasta <= desde) return 0;
  return Math.max(0, diasHabilesEntre(desde, hasta) - 1);
}

// Encadena las tareas desde el índice `desde` (inclusive): esa arranca en
// `inicioDesde` y cada siguiente el día hábil posterior al fin de la anterior.
// Las anteriores a `desde` no se tocan, que es lo que hace que mover una fecha
// empuje solo hacia adelante.
//
// Con una excepción: los grupos. Las tareas que una persona agrupó
// explícitamente se mueven como una unidad y conservan su relación temporal,
// en vez de volver a repartirse una detrás de la otra cada vez que se toca algo
// anterior.
//
// Cada miembro se ancla al PRIMERO de su grupo y no a su vecino inmediato. Es
// lo que hace que el grupo aguante que le metan una tarea suelta en el medio al
// reordenar: la relación es con el grupo, no con quien haya quedado al lado.
//
// La tarea que sigue a un grupo arranca después del fin MÁS TARDÍO del grupo,
// no del de la última en orden: si la primera del grupo dura más, encadenar
// contra la última la dejaría empezando encima de una tarea todavía abierta,
// que es justo lo que la secuencia existe para evitar.
export function planificar(
  tareas: TareaPlanificable[],
  desde: number,
  inicioDesde: Date,
): { fechaInicio: Date; fechaFin: Date }[] {
  const plan: { fechaInicio: Date; fechaFin: Date }[] = [];
  // El fin más tardío ya planificado, en milisegundos. Con grupos deja de ser
  // el de la última tarea en orden.
  let finMaximoMs = 0;

  // Dónde arranca cada grupo, antes y después de replanificar. Con las dos se
  // traslada la separación original al lugar nuevo.
  const anclaDeGrupo = new Map<string, { viejo: Date; nuevo: Date }>();
  const recordarAncla = (t: TareaPlanificable, inicioNuevo: Date) => {
    if (!t.grupoId || !t.fechaInicio || anclaDeGrupo.has(t.grupoId)) return;
    anclaDeGrupo.set(t.grupoId, { viejo: t.fechaInicio, nuevo: inicioNuevo });
  };

  // Las tareas anteriores al ancla no se replanifican, pero sí pueden ser el
  // primer miembro de un grupo que sigue más adelante: su fecha actual es a la
  // vez la vieja y la nueva.
  for (let i = 0; i < desde; i++) {
    const t = tareas[i];
    if (t.fechaInicio) recordarAncla(t, t.fechaInicio);
    if (t.fechaFin) finMaximoMs = Math.max(finMaximoMs, t.fechaFin.getTime());
  }

  for (let i = desde; i < tareas.length; i++) {
    const t = tareas[i];
    let inicio: Date;

    const ancla = t.grupoId ? anclaDeGrupo.get(t.grupoId) : undefined;
    if (i === desde) {
      // El ancla del recálculo manda: es la fecha que pidió la persona.
      inicio = siguienteDiaHabil(inicioDesde);
    } else if (ancla && t.fechaInicio) {
      inicio = sumarDiasHabiles(
        ancla.nuevo,
        separacionHabil(ancla.viejo, t.fechaInicio),
      );
    } else {
      inicio = siguienteDiaHabil(new Date(finMaximoMs + DIA_MS));
    }

    const fin = finTrasDiasHabiles(inicio, t.duracionDias);
    plan.push({ fechaInicio: inicio, fechaFin: fin });
    recordarAncla(t, inicio);
    finMaximoMs = Math.max(finMaximoMs, fin.getTime());
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
): Promise<{ id: string; fechaInicio: Date; fechaFin: Date }[]> {
  const tareas = await getTareasEnOrden(clienteId, db);
  if (tareas.length === 0) return [];

  const indice = anclaId ? tareas.findIndex((t) => t.id === anclaId) : -1;
  const desde = indice >= 0 ? indice : 0;
  const inicio =
    inicioForzado ??
    (indice >= 0 ? tareas[desde].fechaInicio : await inicioProyecto(clienteId, db));

  const plan = planificar(tareas, desde, inicio);

  return plan.flatMap(({ fechaInicio, fechaFin }, i) => {
    const tarea = tareas[desde + i];
    const igual =
      tarea.fechaInicio.getTime() === fechaInicio.getTime() &&
      tarea.fechaFin.getTime() === fechaFin.getTime();
    return igual ? [] : [{ id: tarea.id, fechaInicio, fechaFin }];
  });
}

// Las escrituras del reencadenado como operaciones sueltas, para que el
// llamador las mande junto con las suyas en un único $transaction([...]).
export function escriturasDeSecuencia(
  cambios: { id: string; fechaInicio: Date; fechaFin: Date }[],
) {
  return cambios.map((c) =>
    prisma.tareaRoadmap.update({
      where: { id: c.id },
      data: { fechaInicio: c.fechaInicio, fechaFin: c.fechaFin },
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

  const plan = planificar(tareas, desde, inicio);

  // En serie sobre `db` y no en un $transaction propio: cuando esto corre
  // dentro de una transacción abrir otra no está permitido, y cuando corre
  // suelto el llamador ya decidió que no la necesita.
  const cambiadas: string[] = [];
  for (const [i, { fechaInicio, fechaFin }] of plan.entries()) {
    const tarea = tareas[desde + i];
    const igual =
      tarea.fechaInicio.getTime() === fechaInicio.getTime() &&
      tarea.fechaFin.getTime() === fechaFin.getTime();
    if (igual) continue;
    cambiadas.push(tarea.id);
    await db.tareaRoadmap.update({
      where: { id: tarea.id },
      data: { fechaInicio, fechaFin },
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
  const todas = plantillas.flatMap((p) => p.tareas);
  const plan = planificar(todas, 0, arranque);

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
          duracionDias: t.duracionDias,
          horasEstimadas: t.horasEstimadas,
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
