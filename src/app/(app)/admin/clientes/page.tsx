import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  crearCliente,
  actualizarCliente,
  alternarActivoCliente,
} from "./actions";
import { NuevoClienteForm } from "./nuevo-cliente-form";
import { BTN_SECONDARY_SM, BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";

export default async function ClientesPage() {
  await requireAdmin();
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Proyectos</h1>
        <InfoButton>Proyectos disponibles al cargar horas y viáticos.</InfoButton>
      </div>

      <div className="shrink-0">
        <NuevoClienteForm action={crearCliente} />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4 py-2">Nombre del proyecto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <form id={`cliente-${c.id}`} action={actualizarCliente.bind(null, c.id)}>
                    <input
                      name="nombre"
                      defaultValue={c.nombre}
                      className="w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-dc-text outline-none focus:border-dc-peri"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 text-center">
                  <form action={alternarActivoCliente.bind(null, c.id, !c.activo)}>
                    <button type="submit" className={c.activo ? BTN_PILL_ON : BTN_PILL_OFF}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-center">
                  <button type="submit" form={`cliente-${c.id}`} className={BTN_SECONDARY_SM}>
                    Guardar
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={3}>
                  Todavía no hay proyectos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
