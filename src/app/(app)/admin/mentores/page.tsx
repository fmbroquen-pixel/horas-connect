import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { alternarActivoMentor } from "./actions";
import { NuevoMentorForm } from "./nuevo-mentor-form";

const ETIQUETA_TIPO_TARIFA: Record<string, string> = {
  fija: "Tarifa fija",
  variable: "Tarifa variable",
};

export default async function MentoresPage() {
  await requireAdmin();
  const mentores = await prisma.mentor.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 className="font-display text-lg uppercase text-white">Mentores</h1>
      <p className="mt-1 text-sm text-dc-muted">
        Cada mentor necesita un tipo de tarifa configurado antes de poder
        cargar horas facturables.
      </p>

      <NuevoMentorForm />

      <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
        <table className="w-full text-sm">
          <tbody>
            {mentores.map((m) => (
              <tr key={m.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/mentores/${m.id}`}
                    className="text-dc-text hover:text-dc-peri"
                  >
                    {m.nombre}
                  </Link>
                  <p className="text-xs text-dc-muted">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      m.tipoTarifa
                        ? "rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri"
                        : "rounded-full bg-dc-pink/15 px-3 py-1 text-xs text-dc-pink"
                    }
                  >
                    {m.tipoTarifa
                      ? ETIQUETA_TIPO_TARIFA[m.tipoTarifa]
                      : "Sin tarifa configurada"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={alternarActivoMentor.bind(null, m.id, !m.activo)}>
                    <button
                      type="submit"
                      className={
                        m.activo
                          ? "rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri"
                          : "rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted"
                      }
                    >
                      {m.activo ? "Activo" : "Inactivo"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {mentores.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={3}>
                  Todavía no hay mentores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
