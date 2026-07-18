import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import {
  GRID_TAREAS,
  COLOR_ESTADO_TAREA,
  ETIQUETA_ESTADO_TAREA,
  type TareaFila,
} from "../../constantes";
import { NuevaTareaBoton } from "./nueva-tarea-form";
import { FilaTarea } from "./fila-tarea";
import { InfoButton } from "@/components/info-button";

const DIA_MS = 24 * 60 * 60 * 1000;

// Pestaña Gantt: cronograma inicial del proyecto. La visualización se
// calcula en el servidor a partir de las tareas; el modelo (TareaProyecto)
// admite evolucionar la vista (zoom, dependencias, drag) sin migrar datos.
export default async function ProyectoGanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const tareas = await prisma.tareaProyecto.findMany({
    where: { clienteId: id },
    orderBy: [{ fechaInicio: "asc" }, { createdAt: "asc" }],
  });

  const filas: TareaFila[] = tareas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fechaInicio: t.fechaInicio.toISOString().slice(0, 10),
    fechaFin: t.fechaFin.toISOString().slice(0, 10),
    estado: t.estado,
    responsable: t.responsable ?? "",
  }));

  // Ventana temporal del cronograma: de la primera fecha de inicio a la
  // última de fin (mínimo 1 día para evitar división por cero).
  let timeline: { fila: TareaFila; left: number; width: number }[] = [];
  let desdeISO = "";
  let hastaISO = "";
  if (filas.length > 0) {
    const min = Math.min(...tareas.map((t) => t.fechaInicio.getTime()));
    const max = Math.max(...tareas.map((t) => t.fechaFin.getTime()));
    const total = Math.max(max - min + DIA_MS, DIA_MS);
    desdeISO = new Date(min).toISOString().slice(0, 10);
    hastaISO = new Date(max).toISOString().slice(0, 10);
    timeline = filas.map((fila, i) => {
      const ini = tareas[i].fechaInicio.getTime();
      const fin = tareas[i].fechaFin.getTime();
      return {
        fila,
        left: ((ini - min) / total) * 100,
        width: Math.max(((fin - ini + DIA_MS) / total) * 100, 1.5),
      };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">Cronograma</h2>
          <InfoButton>
            Tareas e hitos del proyecto con fechas, estado y responsable. La
            barra muestra la posición de cada tarea dentro del período total.
          </InfoButton>
        </div>
        <NuevaTareaBoton clienteId={id} />
      </div>

      {/* Vista de barras */}
      {timeline.length > 0 && (
        <div className="rounded-2xl border border-dc-line bg-dc-card p-5">
          <div className="mb-3 flex items-center justify-between text-xs text-dc-muted">
            <span>{mostrarFechaISO(desdeISO)}</span>
            <span>{mostrarFechaISO(hastaISO)}</span>
          </div>
          <div className="space-y-2">
            {timeline.map(({ fila, left, width }) => (
              <div key={fila.id} className="grid grid-cols-[160px_1fr] items-center gap-3">
                <span className="truncate text-xs text-dc-text" title={fila.titulo}>
                  {fila.titulo}
                </span>
                <div className="relative h-5 rounded-full bg-dc-line/40">
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: COLOR_ESTADO_TAREA[fila.estado],
                      opacity: fila.estado === "hecha" ? 0.55 : 0.9,
                    }}
                    title={`${fila.titulo}: ${mostrarFechaISO(fila.fechaInicio)} → ${mostrarFechaISO(fila.fechaFin)} (${ETIQUETA_ESTADO_TAREA[fila.estado]})`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-dc-muted">
            {Object.entries(ETIQUETA_ESTADO_TAREA).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLOR_ESTADO_TAREA[k] }}
                />
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla editable */}
      <div className="overflow-x-auto dc-panel">
        <div className="min-w-[880px]">
          <div className={`dc-thead ${GRID_TAREAS} border-b border-dc-line px-3`}>
            <span>Título</span>
            <span>Inicio</span>
            <span>Fin</span>
            <span>Estado</span>
            <span>Responsable</span>
            <span />
          </div>

          {filas.map((f) => (
            <FilaTarea key={f.id} tarea={f} />
          ))}

          {filas.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-dc-muted">
              Todavía no hay tareas en el cronograma.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
