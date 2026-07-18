import { notFound } from "next/navigation";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { TableroForm } from "./tablero-form";

// Pestaña Tablero: enlace externo al tablero operativo del proyecto.
export default async function ProyectoTableroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  return (
    <div className="max-w-2xl rounded-2xl border border-dc-line bg-dc-card p-6">
      <h2 className="font-display text-sm uppercase text-white">
        Tablero de trabajo
      </h2>
      <p className="mt-1 text-xs text-dc-muted">
        Guardá el enlace al tablero operativo del proyecto (Notion, Trello,
        ClickUp, etc.) para abrirlo desde acá.
      </p>
      <div className="mt-4">
        <TableroForm
          clienteId={id}
          tableroUrl={acceso.cliente.tableroUrl ?? ""}
        />
      </div>
    </div>
  );
}
