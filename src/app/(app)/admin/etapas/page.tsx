import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarEtapa, alternarActivoEtapa, crearEtapa } from "./actions";
import { AgregarModal } from "@/components/admin/agregar-modal";
import { BTN_SECONDARY_SM, BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";
import { FiltroEstado, parseEstadoFiltro } from "@/components/admin/filtro-estado";

// Etapas no tiene pantalla "Editar" propia (todo se edita inline en esta
// tabla), así que a diferencia de Usuarios/Clientes conserva el toggle de
// estado acá mismo.
export default async function EtapasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireAdmin();
  const { estado: estadoParam } = await searchParams;
  const estado = parseEstadoFiltro(estadoParam);

  const etapas = await prisma.etapa.findMany({
    where: estado === "todos" ? {} : { activo: estado === "activos" },
    orderBy: [{ grupo: "asc" }, { orden: "asc" }],
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg uppercase text-white">Etapas</h1>
          <InfoButton>
            Opciones del desplegable de Etapa al cargar horas y viáticos,
            agrupadas.
          </InfoButton>
        </div>
        <AgregarModal
          botonLabel="+ Agregar etapa"
          titulo="Nueva etapa"
          campos={[
            { name: "etiqueta", label: "Etiqueta", placeholder: "Ej: Retrospectiva" },
            { name: "grupo", label: "Grupo", placeholder: "Ej: Cierre / Retrospectiva" },
          ]}
          action={crearEtapa}
          toastMsg="Etapa creada"
          submitLabel="Crear etapa"
        />
      </div>

      <div className="mt-4 flex shrink-0 justify-end">
        <FiltroEstado basePath="/admin/etapas" actual={estado} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4">Etiqueta</th>
              <th className="px-4">Grupo</th>
              <th className="w-[120px] px-4">Estado</th>
              <th className="w-[110px] border-l border-dc-line px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {etapas.map((e) => (
              <tr key={e.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3 text-center">
                  <form id={`etapa-${e.id}`} action={actualizarEtapa.bind(null, e.id)}>
                    <input
                      name="etiqueta"
                      defaultValue={e.etiqueta}
                      className="w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-center text-dc-text outline-none focus:border-dc-peri"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    name="grupo"
                    form={`etapa-${e.id}`}
                    defaultValue={e.grupo}
                    className="w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-center text-xs text-dc-muted outline-none focus:border-dc-peri"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <form action={alternarActivoEtapa.bind(null, e.id, !e.activo)}>
                    <button type="submit" className={e.activo ? BTN_PILL_ON : BTN_PILL_OFF}>
                      {e.activo ? "Activa" : "Inactiva"}
                    </button>
                  </form>
                </td>
                <td className="border-l border-dc-line px-4 py-3 text-center">
                  <button type="submit" form={`etapa-${e.id}`} className={BTN_SECONDARY_SM}>
                    Guardar
                  </button>
                </td>
              </tr>
            ))}
            {etapas.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={4}>
                  {estado === "todos"
                    ? "Todavía no hay etapas cargadas."
                    : "No hay etapas que coincidan con este filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
