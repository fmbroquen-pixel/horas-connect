import { prisma } from "@/lib/prisma";
import { tareasVivas } from "@/lib/roadmap-papelera";

// La "etapa actual" de un proyecto deja de ser un dato aparte: es la última
// tarea EN CURSO de su Roadmap, según el orden del plan. Así el estado que se
// ve en el Home y el plan que se administra en Follow Up no pueden
// contradecirse, porque son la misma fila de la base.
//
// "Última" y no "primera" porque el plan es secuencial: si hay varias en
// curso, la más avanzada es la que describe dónde está el proyecto.

export type TareaEtapa = { id: string; nombre: string; lista: string };

export type EtapaProyecto = {
  // Tarea en curso más avanzada, o null si no hay ninguna.
  actual: TareaEtapa | null;
  // Elegibles: la actual (para poder mostrarla) y todo lo que viene DESPUÉS
  // en el plan. Ofrecer tareas anteriores invitaría a retroceder, que no es
  // lo que se hace desde un tablero de estado: se avanza. Sin etapa actual
  // todavía, el plan entero está disponible.
  opciones: TareaEtapa[];
};

// Orden de ejecución del plan: por lista y, dentro de cada lista, por orden.
const ORDEN_PLAN = [
  { lista: { orden: "asc" } },
  { lista: { createdAt: "asc" } },
  { orden: "asc" },
  { createdAt: "asc" },
] as const;

export async function getEtapasPorProyecto(
  clienteIds: string[],
): Promise<Record<string, EtapaProyecto>> {
  if (clienteIds.length === 0) return {};

  // Lo que está en la papelera no forma parte del plan, así que tampoco puede
  // ser la etapa actual ni aparecer entre las opciones.
  const tareas = await prisma.tareaRoadmap.findMany({
    where: tareasVivas({ clienteId: { in: clienteIds } }),
    orderBy: [...ORDEN_PLAN],
    select: {
      id: true,
      nombre: true,
      estado: true,
      lista: { select: { nombre: true, clienteId: true } },
    },
  });

  // Primero el plan completo por proyecto, en orden.
  const planes = new Map<string, { tareas: TareaEtapa[]; actual: TareaEtapa | null }>();
  for (const t of tareas) {
    const clienteId = t.lista.clienteId;
    const plan = planes.get(clienteId) ?? { tareas: [], actual: null };
    const item = { id: t.id, nombre: t.nombre, lista: t.lista.nombre };
    plan.tareas.push(item);
    // Las tareas vienen en orden, así que la última en curso que se ve gana.
    if (t.estado === "en_curso") plan.actual = item;
    planes.set(clienteId, plan);
  }

  const salida: Record<string, EtapaProyecto> = {};
  for (const [clienteId, plan] of planes) {
    const desde = plan.actual
      ? plan.tareas.findIndex((t) => t.id === plan.actual!.id)
      : 0;
    salida[clienteId] = { actual: plan.actual, opciones: plan.tareas.slice(desde) };
  }
  return salida;
}
