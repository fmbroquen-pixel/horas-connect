import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { crearCliente, alternarActivoCliente } from "./actions";
import { ETIQUETA_PRODUCTO } from "./constantes";
import { AgregarModal } from "@/components/admin/agregar-modal";
import { BTN_SECONDARY_SM, BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";

// Lista de clientes con el mismo patrón que Usuarios: tabla + "Editar" que
// lleva al detalle (/admin/clientes/[id]) donde viven los datos y el equipo.
export default async function ClientesPage() {
  await requireAdmin();
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg uppercase text-white">Clientes</h1>
          <InfoButton>
            Clientes disponibles al cargar horas y viáticos. Desde Editar se
            configuran los datos del servicio y el equipo de cada cliente.
          </InfoButton>
        </div>
        <AgregarModal
          botonLabel="+ Agregar cliente"
          titulo="Nuevo cliente"
          campos={[{ name: "nombre", label: "Nombre del cliente", placeholder: "Ej: Andreu" }]}
          action={crearCliente}
          toastMsg="Cliente creado"
          submitLabel="Crear cliente"
        />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4 py-2 text-left">Nombre del cliente</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <p className="text-dc-text">{c.nombre}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  {c.producto ? (
                    <span className="rounded-full bg-dc-line px-3 py-1 text-xs text-dc-text">
                      {ETIQUETA_PRODUCTO[c.producto] ?? c.producto}
                    </span>
                  ) : (
                    <span className="text-dc-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <form action={alternarActivoCliente.bind(null, c.id, !c.activo)}>
                    <button type="submit" className={c.activo ? BTN_PILL_ON : BTN_PILL_OFF}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/clientes/${c.id}`} className={BTN_SECONDARY_SM}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={4}>
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
