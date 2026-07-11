import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  crearCliente,
  actualizarCliente,
  alternarActivoCliente,
} from "./actions";
import { NuevoClienteForm } from "./nuevo-cliente-form";

export default async function ClientesPage() {
  await requireAdmin();
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-lg uppercase text-white">Clientes</h1>
      <p className="mt-1 text-sm text-dc-muted">
        Proyectos/clientes disponibles al cargar horas.
      </p>

      <NuevoClienteForm action={crearCliente} />

      <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
        <table className="w-full text-sm">
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <form
                    action={actualizarCliente.bind(null, c.id)}
                    className="flex items-center gap-2"
                  >
                    <input
                      name="nombre"
                      defaultValue={c.nombre}
                      className="w-full max-w-xs rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-dc-text outline-none focus:border-dc-peri"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-text"
                    >
                      Guardar
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form
                    action={alternarActivoCliente.bind(null, c.id, !c.activo)}
                  >
                    <button
                      type="submit"
                      className={
                        c.activo
                          ? "rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri"
                          : "rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted"
                      }
                    >
                      {c.activo ? "Activo" : "Inactivo"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={2}>
                  Todavía no hay clientes cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
