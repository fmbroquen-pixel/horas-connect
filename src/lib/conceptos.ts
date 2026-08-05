import { prisma } from "@/lib/prisma";

// Conceptos de Time Tracking: en qué se consumieron las horas. Catálogo corto
// y curado, administrado desde Settings → Conceptos, independiente del
// Roadmap: el plan proyecta, el concepto clasifica gasto real.

export type OpcionConcepto = { id: string; nombre: string };

// Los que se ofrecen al cargar horas. Los inactivos quedan afuera del
// desplegable pero siguen etiquetando el historial que ya los usó.
export async function getConceptosActivos(): Promise<OpcionConcepto[]> {
  const conceptos = await prisma.concepto.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true },
  });
  return conceptos;
}
