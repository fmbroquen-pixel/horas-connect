import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarTema, alternarActivoTema } from "./actions";
import { NuevoTemaForm } from "./nuevo-tema-form";

export default async function TemasPage() {
  await requireAdmin();
  const temas = await prisma.tema.findMany({
    orderBy: [{ grupo: "asc" }, { orden: "asc" }],
  });

  return (
    <div>
      <h1 className="font-display text-lg uppercase text-white">Temas</h1>
      <p className="mt-1 text-sm text-dc-muted">
        Opciones del desplegable de Temática al cargar horas, agrupadas.
      </p>

      <NuevoTemaForm />

      <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
        <table className="w-full text-sm">
          <tbody>
            {temas.map((t) => (
              <tr key={t.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <form
                    action={actualizarTema.bind(null, t.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      name="etiqueta"
                      defaultValue={t.etiqueta}
                      className="w-48 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-dc-text outline-none focus:border-dc-peri"
                    />
                    <input
                      name="grupo"
                      defaultValue={t.grupo}
                      className="w-56 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-muted outline-none focus:border-dc-peri"
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
                  <form action={alternarActivoTema.bind(null, t.id, !t.activo)}>
                    <button
                      type="submit"
                      className={
                        t.activo
                          ? "rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri"
                          : "rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted"
                      }
                    >
                      {t.activo ? "Activo" : "Inactivo"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {temas.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={2}>
                  Todavía no hay temas cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
