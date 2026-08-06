import { prisma } from "@/lib/prisma";

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
  // Todas las tareas del plan, en orden: son las opciones elegibles.
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

  const tareas = await prisma.tareaRoadmap.findMany({
    where: { lista: { clienteId: { in: clienteIds } } },
    orderBy: [...ORDEN_PLAN],
    select: {
      id: true,
      nombre: true,
      estado: true,
      lista: { select: { nombre: true, clienteId: true } },
    },
  });

  const salida: Record<string, EtapaProyecto> = {};
  for (const t of tareas) {
    const clienteId = t.lista.clienteId;
    salida[clienteId] ??= { actual: null, opciones: [] };
    const item = { id: t.id, nombre: t.nombre, lista: t.lista.nombre };
    salida[clienteId].opciones.push(item);
    // Las tareas vienen en orden, así que la última en curso que se ve gana.
    if (t.estado === "en_curso") salida[clienteId].actual = item;
  }
  return salida;
}
