import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarEtapa, alternarActivoEtapa } from "./actions";
import { NuevaEtapaForm } from "./nueva-etapa-form";
import { BTN_SECONDARY_SM, BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";

export default async function EtapasPage() {
  await requireAdmin();
  const etapas = await prisma.etapa.findMany({
    orderBy: [{ grupo: "asc" }, { orden: "asc" }],
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Etapas</h1>
        <InfoButton>
          Opciones del desplegable de Etapa al cargar horas y viáticos,
          agrupadas.
        </InfoButton>
      </div>

      <div className="shrink-0">
        <NuevaEtapaForm />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4 py-2">Etiqueta</th>
              <th className="px-4 py-2">Grupo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {etapas.map((e) => (
              <tr key={e.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <form id={`etapa-${e.id}`} action={actualizarEtapa.bind(null, e.id)}>
                    <input
                      name="etiqueta"
                      defaultValue={e.etiqueta}
                      className="w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-dc-text outline-none focus:border-dc-peri"
                    />
                  </form>
                </td>
                <td className="px-4 py-3">
                  <input
                    name="grupo"
                    form={`etapa-${e.id}`}
                    defaultValue={e.grupo}
                    className="w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-muted outline-none focus:border-dc-peri"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <form action={alternarActivoEtapa.bind(null, e.id, !e.activo)}>
                    <button type="submit" className={e.activo ? BTN_PILL_ON : BTN_PILL_OFF}>
                      {e.activo ? "Activa" : "Inactiva"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-center">
                  <button type="submit" form={`etapa-${e.id}`} className={BTN_SECONDARY_SM}>
                    Guardar
                  </button>
                </td>
              </tr>
            ))}
            {etapas.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={4}>
                  Todavía no hay etapas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
