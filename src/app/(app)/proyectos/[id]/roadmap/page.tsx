import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { asegurarRoadmap } from "@/lib/roadmap";
import { formatHorasHsMin } from "@/lib/horas";
import { InfoButton } from "@/components/info-button";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import { ListaRoadmapCard } from "./lista-roadmap";
import { NuevaListaBoton } from "./nueva-lista-boton";
import type { ListaRoadmapVista } from "./constantes";

const CARD = "rounded-2xl border border-dc-line bg-dc-card px-4 py-3";

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

  const [listas, horasReales] = await Promise.all([
    prisma.listaRoadmap.findMany({
      where: { clienteId: id },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: {
        tareas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
      },
    }),
    // Horas efectivamente cargadas contra el proyecto en Time Tracking: es el
    // contraste del presupuesto, no se puede cargar nada desde acá.
    prisma.registroHoras.aggregate({
      where: { clienteId: id, eliminadoEn: null },
      _sum: { horas: true },
    }),
  ]);

  const vistas: ListaRoadmapVista[] = listas.map((l) => {
    const tareas = l.tareas.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      fechaInicio: t.fechaInicio.toISOString().slice(0, 10),
      fechaFin: t.fechaFin.toISOString().slice(0, 10),
      duracionDias: t.duracionDias,
      horasEstimadas: formatHorasHsMin(Number(t.horasEstimadas)),
      estado: t.estado,
    }));
    return {
      id: l.id,
      nombre: l.nombre,
      tareas,
      horasEstimadas: l.tareas.reduce((a, t) => a + Number(t.horasEstimadas), 0),
      horasEntregadas: l.tareas.reduce(
        (a, t) => a + (t.estado === "finalizada" ? Number(t.horasEstimadas) : 0),
        0,
      ),
    };
  });

  const planificadas = vistas.reduce((a, l) => a + l.horasEstimadas, 0);
  const entregadas = vistas.reduce((a, l) => a + l.horasEntregadas, 0);
  const reales = Number(horasReales._sum.horas ?? 0);

  const todas = listas.flatMap((l) => l.tareas);
  const arranque = todas.length
    ? new Date(Math.min(...todas.map((t) => t.fechaInicio.getTime())))
    : null;
  const cierre = todas.length
    ? new Date(Math.max(...todas.map((t) => t.fechaFin.getTime())))
    : null;

  return (
    // Encabezado y KPIs fijos; solo la columna de listas scrollea.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">
            Plan de trabajo
          </h2>
          <InfoButton>
            Las tareas son secuenciales: cada una arranca el día hábil
            siguiente al fin de la anterior. Al cambiar la fecha de inicio o la
            duración de una tarea se recalculan todas las posteriores; las
            anteriores no se tocan. Las horas estimadas son el presupuesto de
            entrega y, al marcar una tarea como Finalizada, cuentan como horas
            planificadas entregadas. Las horas reales se cargan solo desde Time
            Tracking.
          </InfoButton>
        </div>
        <NuevaListaBoton clienteId={id} />
      </div>

      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          titulo="Horas planificadas"
          valor={formatHorasHsMin(planificadas)}
          nota={`${todas.length} tarea(s) en ${vistas.length} lista(s)`}
        />
        <Kpi
          titulo="Planificadas entregadas"
          valor={formatHorasHsMin(entregadas)}
          nota={
            planificadas > 0
              ? `${Math.round((entregadas / planificadas) * 100)}% del plan`
              : "Sin plan cargado"
          }
        />
        <Kpi
          titulo="Horas reales"
          valor={formatHorasHsMin(reales)}
          nota="Cargadas en Time Tracking"
        />
        <Kpi
          titulo="Ventana del plan"
          valor={
            arranque && cierre
              ? mostrarFechaISO(arranque.toISOString().slice(0, 10))
              : "—"
          }
          nota={
            cierre
              ? `hasta ${mostrarFechaISO(cierre.toISOString().slice(0, 10))}`
              : "Sin tareas"
          }
        />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
        {vistas.map((lista, i) => (
          <ListaRoadmapCard
            key={lista.id}
            lista={lista}
            primera={i === 0}
            ultima={i === vistas.length - 1}
          />
        ))}

        {vistas.length === 0 && (
          <p className="rounded-2xl border border-dc-line bg-dc-card px-4 py-8 text-center text-sm text-dc-muted">
            Este proyecto no tiene listas en el Roadmap. Agregá una para armar
            el plan de trabajo.
          </p>
        )}
      </div>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota: string;
}) {
  return (
    <div className={CARD}>
      <p className="text-[11px] uppercase tracking-wide text-dc-muted">{titulo}</p>
      <p className="mt-1 font-display text-lg tabular-nums text-white">{valor}</p>
      <p className="mt-0.5 truncate text-xs text-dc-muted" title={nota}>
        {nota}
      </p>
    </div>
  );
}
