import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { DatosClienteForm } from "./datos-form";
import {
  GuardadoPaginaProvider,
  BotonGuardarPagina,
} from "@/components/guardado-pagina";
import { GuardiaCambios } from "@/components/guardia-cambios";

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
    <GuardadoPaginaProvider>
    <div className="space-y-4">
      <GuardiaCambios />
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
            // Los clientes cargados antes de que existiera el campo llegan
            // vacíos: el formulario los obliga a completarlo al guardar.
            valorCuotaUsd:
              cliente.valorCuotaUsd !== null
                ? String(Number(cliente.valorCuotaUsd))
                : "",
          }}
        />
      </div>
      </div>

      {/* Fuera de la card, al final de la seccion. */}
      <BotonGuardarPagina />
    </div>
    </GuardadoPaginaProvider>
  );
}
