import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { asegurarRoadmap } from "@/lib/roadmap";
import { formatHorasHsMin } from "@/lib/horas";
import { InfoButton } from "@/components/info-button";
import { RoadmapTablero } from "./tablero";
import type { ListaRoadmapVista } from "./constantes";

// Pestaña Roadmap: el plan de trabajo del proyecto. Reemplaza al Gantt como
// lugar donde se administran las tareas; la vista de cronograma se rediseñará
// más adelante sobre estos mismos datos.
export default async function ProyectoRoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  // Primera visita: se copia el plan sugerido (Onboarding + un tablero por
  // trimestre contratado). A partir de ahí las listas son propias del
  // proyecto y no se vuelven a tocar.
  await asegurarRoadmap(acceso.cliente);

  const listas = await prisma.listaRoadmap.findMany({
    where: { clienteId: id },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: {
      tareas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
    },
  });

  const vistas: ListaRoadmapVista[] = listas.map((l) => {
    const tareas = l.tareas.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      fechaInicio: t.fechaInicio.toISOString().slice(0, 10),
      fechaFin: t.fechaFin.toISOString().slice(0, 10),
      horasEstimadas: formatHorasHsMin(Number(t.horasEstimadas)),
      estado: t.estado,
    }));
    return { id: l.id, nombre: l.nombre, tareas };
  });

  return (
    // Encabezado fijo; solo la columna de listas scrollea.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">
            Plan de trabajo
          </h2>
          <InfoButton>
            Las tareas son estimativas y secuenciales. Una edición de fecha
            modifica las tareas siguientes.
          </InfoButton>
        </div>
      </div>

      <RoadmapTablero clienteId={id} listas={vistas} />
    </div>
  );
}
