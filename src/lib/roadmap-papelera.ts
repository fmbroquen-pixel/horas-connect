import type { Prisma } from "@/generated/prisma/client";

// Filtros de la papelera del Follow Up.
//
// La regla del producto es una sola y vale para todo el sistema: lo que está
// en la papelera cuenta como eliminado hasta que alguien lo restaure. No
// aparece en el plan, no entra en la secuencia de fechas, no suma a las horas
// estimadas ni al avance, y no puede ser la etapa actual.
//
// Está acá y no repetido en cada consulta porque la condición es sutil: una
// tarea deja de contar tanto si la borraron a ella como si borraron su lista.
// Escrita a mano en cada llamador, alcanza con olvidarse la mitad en un solo
// lugar para que un KPI siga sumando algo que el usuario ya mandó a la
// papelera.

// Tareas vivas, opcionalmente acotadas por su lista (cliente, id, …).
export function tareasVivas(
  lista: Prisma.ListaRoadmapWhereInput = {},
): Prisma.TareaRoadmapWhereInput {
  return { eliminadoEn: null, lista: { ...lista, eliminadoEn: null } };
}

// Listas vivas, opcionalmente acotadas (cliente, id, …).
export function listasVivas(
  extra: Prisma.ListaRoadmapWhereInput = {},
): Prisma.ListaRoadmapWhereInput {
  return { ...extra, eliminadoEn: null };
}

// Para los `include` de tareas dentro de una lista, donde el filtro de la
// lista ya lo aplicó la consulta de arriba.
export const SOLO_TAREAS_VIVAS = { eliminadoEn: null } as const;
