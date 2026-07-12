import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarEtapa, alternarActivoEtapa } from "./actions";
import { NuevaEtapaForm } from "./nueva-etapa-form";
import { BTN_SECONDARY_SM, BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";

export default async function EtapasPage() {
  await requireAdmin();
  const etapas = await prisma.etapa.findMany({
    orderBy: [{ grupo: "asc" }, { orden: "asc" }],
  });

  return (
    <div>
      <h1 className="font-display text-lg uppercase text-white">Etapas</h1>
      <p className="mt-1 text-sm text-dc-muted">
        Opciones del desplegable de Etapa al cargar horas y viáticos,
        agrupadas.
      </p>

      <NuevaEtapaForm />

      <div className="mt-6 overflow-hidden dc-panel">
        <table className="w-full text-sm">
          <tbody>
            {etapas.map((e) => (
              <tr key={e.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <form
                    action={actualizarEtapa.bind(null, e.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      name="etiqueta"
                      defaultValue={e.etiqueta}
                      className="w-48 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-dc-text outline-none focus:border-dc-peri"
                    />
                    <input
                      name="grupo"
                      defaultValue={e.grupo}
                      className="w-56 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-muted outline-none focus:border-dc-peri"
                    />
                    <button
                      type="submit"
                      className={BTN_SECONDARY_SM}
                    >
                      Guardar
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={alternarActivoEtapa.bind(null, e.id, !e.activo)}>
                    <button
                      type="submit"
                      className={
                        e.activo
                          ? BTN_PILL_ON
                          : BTN_PILL_OFF
                      }
                    >
                      {e.activo ? "Activa" : "Inactiva"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {etapas.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={2}>
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
