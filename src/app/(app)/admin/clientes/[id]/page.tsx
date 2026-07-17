import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { DatosClienteForm } from "./datos-form";

// Pestaña "Datos" del detalle de cliente.
export default async function ClienteDatosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
      <h2 className="font-display text-sm uppercase text-white">
        Datos del cliente
      </h2>
      <p className="mt-1 text-xs text-dc-muted">
        La fecha de finalización se calcula sola: fecha de inicio + duración.
      </p>
      <div className="mt-4">
        <DatosClienteForm
          clienteId={cliente.id}
          inicial={{
            nombre: cliente.nombre,
            duracionMeses: cliente.duracionMeses ? String(cliente.duracionMeses) : "",
            producto: cliente.producto ?? "",
            fechaInicio: cliente.fechaInicio
              ? cliente.fechaInicio.toISOString().slice(0, 10)
              : "",
          }}
        />
      </div>
    </div>
  );
}
