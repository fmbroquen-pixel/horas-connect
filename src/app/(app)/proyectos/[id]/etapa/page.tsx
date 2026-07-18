import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatFecha } from "@/lib/formato";
import { EtapaForm } from "./etapa-form";

// Pestaña Etapa actual: en qué etapa (de las configuradas en Settings) está
// el proyecto, con su evolución histórica.
export default async function ProyectoEtapaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const [etapas, eventos] = await Promise.all([
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.etapaEvento.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        etapa: { select: { etiqueta: true } },
        creadoPor: { select: { nombre: true } },
      },
    }),
  ]);
  const actual = eventos[0] ?? null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <h2 className="font-display text-sm uppercase text-white">Etapa actual</h2>
        <p className="mt-1 text-xs text-dc-muted">
          Las etapas se configuran en Settings → Etapas. Cada cambio queda
          registrado con fecha y responsable.
        </p>
        <div className="mt-4">
          <EtapaForm
            clienteId={id}
            etapas={etapas.map((e) => ({ value: e.id, label: e.etiqueta }))}
            actualId={actual?.etapaId ?? ""}
          />
        </div>
        {actual && (
          <p className="mt-3 text-xs text-dc-muted">
            Etapa vigente: {actual.etapa.etiqueta} · desde{" "}
            {formatFecha(actual.createdAt)} · {actual.creadoPor.nombre}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <h3 className="font-display text-sm uppercase text-white">Evolución</h3>
        {eventos.length === 0 ? (
          <p className="mt-3 text-sm text-dc-muted">
            Todavía no se registró ninguna etapa.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {eventos.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2.5 border-b border-dc-line pb-2 text-sm last:border-0 last:pb-0"
              >
                <span className="text-dc-text">{e.etapa.etiqueta}</span>
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
