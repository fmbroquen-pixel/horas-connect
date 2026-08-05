import { prisma } from "@/lib/prisma";

// Catálogo de categorías de tarea para Time Tracking. Clasifica en qué TIPO
// de actividad se consumieron las horas; no se ata a la instancia
// calendarizada del Roadmap contra la que se planificó.
//
// El catálogo se deriva del Roadmap y se deduplica por (lista, tarea). La
// "lista" es la plantilla de origen cuando existe, así "Tablero Q1" y
// "Tablero Q3" comparten la categoría "Tablero Trimestral": es la misma clase
// de actividad en distinto trimestre, y el pedido es explícito en que el
// trimestre no forma parte del nombre.

export type OpcionCategoria = { id: string; nombre: string };

export function etiquetaCategoria(lista: string, tarea: string): string {
  return `${lista} — ${tarea}`;
}

// Nombre de lista con el que una tarea entra al catálogo.
function listaDeCategoria(lista: { nombre: string; plantilla: string | null }) {
  return lista.plantilla ?? lista.nombre;
}

// Da de alta las categorías que falten para las tareas de un proyecto. Se
// llama después de cada cambio del Roadmap que pueda estrenar un par nuevo
// (alta de tarea o de lista, renombre, duplicación).
//
// Solo agrega: nunca borra ni renombra. Una categoría con horas cargadas
// tiene que sobrevivir aunque la tarea que le dio origen desaparezca del
// Roadmap, o el historial quedaría sin clasificar.
export async function sincronizarCategorias(clienteId: string): Promise<void> {
  const tareas = await prisma.tareaRoadmap.findMany({
    where: { lista: { clienteId } },
    select: {
      nombre: true,
      lista: { select: { nombre: true, plantilla: true } },
    },
  });

  const pares = new Map<string, { lista: string; nombre: string }>();
  for (const t of tareas) {
    const lista = listaDeCategoria(t.lista);
    pares.set(`${lista}|${t.nombre}`, { lista, nombre: t.nombre });
  }
  if (pares.size === 0) return;

  const existentes = await prisma.categoriaTarea.findMany({
    where: { OR: [...pares.values()] },
    select: { lista: true, nombre: true },
  });
  for (const e of existentes) pares.delete(`${e.lista}|${e.nombre}`);
  if (pares.size === 0) return;

  // skipDuplicates: dos guardados simultáneos pueden intentar el mismo par y
  // el índice único (lista, nombre) es el que manda.
  await prisma.categoriaTarea.createMany({
    data: [...pares.values()],
    skipDuplicates: true,
  });
}

// Catálogo completo, listo para un desplegable. Es global y no depende del
// cliente elegido: la categoría es una clase de actividad, no una instancia
// del Roadmap de un proyecto.
export async function getCategorias(): Promise<OpcionCategoria[]> {
  const categorias = await prisma.categoriaTarea.findMany({
    orderBy: [{ lista: "asc" }, { nombre: "asc" }],
  });
  return categorias.map((c) => ({
    id: c.id,
    nombre: etiquetaCategoria(c.lista, c.nombre),
  }));
}
