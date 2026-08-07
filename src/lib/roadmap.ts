import { prisma } from "@/lib/prisma";
import {
  DIA_MS,
  diasHabilesEntre,
  fechaDesdeISO,
  finTrasDiasHabiles,
  hoyUTC,
  siguienteDiaHabil,
} from "@/lib/dias-habiles";
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

export type TareaPlanificable = { duracionDias: number };

// Encadena las tareas desde el índice `desde` (inclusive): esa arranca en
// `inicioDesde` y cada siguiente el día hábil posterior al fin de la anterior.
// Nunca hay dos tareas en paralelo. Las anteriores a `desde` no se tocan, que
// es lo que hace que mover una fecha empuje solo hacia adelante.
export function planificar(
  tareas: TareaPlanificable[],
  desde: number,
  inicioDesde: Date,
): { fechaInicio: Date; fechaFin: Date }[] {
  const plan: { fechaInicio: Date; fechaFin: Date }[] = [];
  let inicio = siguienteDiaHabil(inicioDesde);

  for (let i = desde; i < tareas.length; i++) {
    const fin = finTrasDiasHabiles(inicio, tareas[i].duracionDias);
    plan.push({ fechaInicio: inicio, fechaFin: fin });
    inicio = siguienteDiaHabil(new Date(fin.getTime() + DIA_MS));
  }
  return plan;
}

// ── Persistencia ──────────────────────────────────────────────────────────

// Todas las tareas del proyecto en el orden en que se ejecutan: por lista y,
// dentro de cada lista, por orden. Esa secuencia única es la cadena de
// dependencias del roadmap.
export async function getTareasEnOrden(clienteId: string, db: DB = prisma) {
  const listas = await db.listaRoadmap.findMany({
    where: { clienteId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: {
      tareas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
    },
  });
  return listas.flatMap((l) => l.tareas);
}

// Reencadena las fechas del proyecto a partir de una tarea. Si `anclaId` no se
// pasa (o ya no existe), se replanifica todo desde el arranque del proyecto.
// Solo escribe las filas cuya fecha efectivamente cambió.
export async function resecuenciar(
  clienteId: string,
  anclaId?: string,
  inicioForzado?: Date,
  db: DB = prisma,
): Promise<void> {
  const tareas = await getTareasEnOrden(clienteId, db);
  if (tareas.length === 0) return;

  const indice = anclaId ? tareas.findIndex((t) => t.id === anclaId) : -1;
  const desde = indice >= 0 ? indice : 0;
  const inicio =
    inicioForzado ??
    (indice >= 0 ? tareas[desde].fechaInicio : await inicioProyecto(clienteId, db));

  const plan = planificar(tareas, desde, inicio);

  // En serie sobre `db` y no en un $transaction propio: cuando esto corre
  // dentro de una transacción abrir otra no está permitido, y cuando corre
  // suelto el llamador ya decidió que no la necesita.
  for (const [i, { fechaInicio, fechaFin }] of plan.entries()) {
    const tarea = tareas[desde + i];
    const igual =
      tarea.fechaInicio.getTime() === fechaInicio.getTime() &&
      tarea.fechaFin.getTime() === fechaFin.getTime();
    if (igual) continue;
    await db.tareaRoadmap.update({
      where: { id: tarea.id },
      data: { fechaInicio, fechaFin },
    });
  }
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
  cliente: Pick<Cliente, "id" | "duracionMeses" | "fechaInicio" | "roadmapCreadoEn">,
): Promise<void> {
  if (cliente.roadmapCreadoEn) return;

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
