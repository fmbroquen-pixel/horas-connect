import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatFecha } from "@/lib/formato";
import { ETIQUETA_SEMAFORO, COLOR_SEMAFORO } from "../../constantes";
import { SemaforoSelector } from "./semaforo-selector";

// Pestaña Semáforo: estado de salud del proyecto con historial de cambios.
export default async function ProyectoSemaforoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const eventos = await prisma.semaforoEvento.findMany({
    where: { clienteId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { creadoPor: { select: { nombre: true } } },
  });
  const actual = eventos[0] ?? null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <h2 className="font-display text-sm uppercase text-white">Semáforo</h2>
        <p className="mt-1 text-xs text-dc-muted">
          Estado de salud del proyecto. Cada cambio queda registrado con fecha
          y responsable.
        </p>
        <div className="mt-4">
          <SemaforoSelector clienteId={id} actual={actual?.estado ?? ""} />
        </div>
        {actual && (
          <p className="mt-3 text-xs text-dc-muted">
            Último cambio: {ETIQUETA_SEMAFORO[actual.estado]} ·{" "}
            {formatFecha(actual.createdAt)} · {actual.creadoPor.nombre}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <h3 className="font-display text-sm uppercase text-white">Historial</h3>
        {eventos.length === 0 ? (
          <p className="mt-3 text-sm text-dc-muted">
            Todavía no se registró ningún estado.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {eventos.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2.5 border-b border-dc-line pb-2 text-sm last:border-0 last:pb-0"
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLOR_SEMAFORO[e.estado] }}
                />
                <span className="text-dc-text">{ETIQUETA_SEMAFORO[e.estado]}</span>
                <span className="ml-auto text-xs text-dc-muted">
                  {formatFecha(e.createdAt)} · {e.creadoPor.nombre}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
