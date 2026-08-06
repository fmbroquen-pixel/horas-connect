import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { asegurarRoadmap } from "@/lib/roadmap";
import { formatHorasHsMin } from "@/lib/horas";
import { InfoButton } from "@/components/info-button";
import { RoadmapTablero } from "./tablero";
import { CabeceraSeguimiento } from "./cabecera-seguimiento";
import { formatFecha } from "@/lib/formato";
import type { ListaRoadmapVista } from "./constantes";

// Pestaña Follow Up: el seguimiento del proyecto. Arriba, el estado de un
// vistazo (semáforo y tablero de trabajo, que antes vivían en una pestaña
// propia); debajo, el plan de trabajo con sus listas.
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

  const semaforo = await prisma.semaforoEvento.findFirst({
    where: { clienteId: id },
    orderBy: { createdAt: "desc" },
  });

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
      personas: t.personas,
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

      <CabeceraSeguimiento
        clienteId={id}
        semaforo={semaforo?.estado ?? ""}
        ultimoCambio={semaforo ? formatFecha(semaforo.createdAt) : ""}
        tableroUrl={acceso.cliente.tableroUrl ?? ""}
      />

      <RoadmapTablero clienteId={id} listas={vistas} />
    </div>
  );
}
