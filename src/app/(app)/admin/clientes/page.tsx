import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { crearCliente } from "./actions";
import { ETIQUETA_PRODUCTO } from "./constantes";
import { AgregarModal } from "@/components/admin/agregar-modal";
import { BTN_SECONDARY_SM, TAG_ON, TAG_OFF } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";
import { FiltroEstado, parseEstadoFiltro } from "@/components/admin/filtro-estado";

// Lista de clientes con el mismo patrón que Usuarios: tabla + "Editar" que
// lleva al detalle (/admin/clientes/[id]) donde viven los datos y el equipo.
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireAdmin();
  const { estado: estadoParam } = await searchParams;
  const estado = parseEstadoFiltro(estadoParam);

  const clientes = await prisma.cliente.findMany({
    where: estado === "todos" ? {} : { activo: estado === "activos" },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg uppercase text-white">Clientes</h1>
          <InfoButton>
            Clientes disponibles al cargar horas. Desde Editar se configuran
            los datos del servicio, el estado y el equipo de cada cliente.
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

      <div className="mt-4 flex shrink-0 justify-end">
        <FiltroEstado basePath="/admin/clientes" actual={estado} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4">Nombre del cliente</th>
              <th className="w-[180px] px-4">Producto</th>
              <th className="w-[110px] px-4">Estado</th>
              <th className="w-[110px] border-l border-dc-line px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3 text-center">
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
                  <span className={c.activo ? TAG_ON : TAG_OFF}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="border-l border-dc-line px-4 py-3 text-center">
                  <Link href={`/admin/clientes/${c.id}`} className={BTN_SECONDARY_SM}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={4}>
                  {estado === "todos"
                    ? "Todavía no hay clientes cargados."
                    : "No hay clientes que coincidan con este filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
