import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { asegurarRoadmap } from "@/lib/roadmap";
import { SOLO_TAREAS_VIVAS, listasVivas } from "@/lib/roadmap-papelera";
import { formatHorasHsMin } from "@/lib/horas";
import { InfoButton } from "@/components/info-button";
import { RoadmapTablero } from "./tablero";
import { CabeceraSeguimiento } from "./cabecera-seguimiento";
import { PapeleraMenu } from "../../../papelera/papelera-menu";
import { formatFecha } from "@/lib/formato";
import type { ListaRoadmapVista } from "./constantes";

// Pestaña Follow Up: el seguimiento del proyecto. Arriba, el estado de un
// vistazo (semáforo y tablero de trabajo, que antes vivían en una pestaña
// propia); debajo, el plan de trabajo con sus listas.
export default async function ProyectoRoadmapPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // ?lista= y ?tarea= llegan desde "Próximas dos semanas" del Home. Son ids,
  // no nombres: los nombres de tarea se repiten entre proyectos y entre
  // trimestres ("Office Hours" aparece cuatro veces en un mismo plan).
  searchParams: Promise<{ lista?: string; tarea?: string }>;
}) {
  const { id } = await params;
  const { lista: listaDestino, tarea: tareaDestino } = await searchParams;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  // Primera visita: se copia el plan sugerido (Onboarding + un tablero por
  // trimestre contratado). A partir de ahí las listas son propias del
  // proyecto y no se vuelven a tocar.
  await asegurarRoadmap(acceso.cliente);

  // En paralelo: son independientes entre sí, y contra una base remota cada
  // ida y vuelta cuesta más que la consulta en sí. En serie, el semáforo
  // retrasaba las listas sin ningún motivo.
  const [semaforo, listas] = await Promise.all([
    prisma.semaforoEvento.findFirst({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listaRoadmap.findMany({
      where: listasVivas({ clienteId: id }),
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: {
        tareas: {
          where: SOLO_TAREAS_VIVAS,
          orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
  ]);

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
            modifica las tareas siguientes. Lo que se elimina va a la papelera:
            deja de contar en el plan y en los KPIs, y se puede restaurar.
          </InfoButton>
        </div>
        <PapeleraMenu tipo="roadmap" />
      </div>

      <CabeceraSeguimiento
        clienteId={id}
        semaforo={semaforo?.estado ?? ""}
        ultimoCambio={semaforo ? formatFecha(semaforo.createdAt) : ""}
        tableroUrl={acceso.cliente.tableroUrl ?? ""}
      />

      <RoadmapTablero
        clienteId={id}
        listas={vistas}
        listaDestino={listaDestino}
        tareaDestino={tareaDestino}
      />
    </div>
  );
}
