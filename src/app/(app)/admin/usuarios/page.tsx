import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { alternarActivoUsuario } from "./actions";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";
import { BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administrador",
  guest: "Mentor",
  reader: "Solo lectura",
};

const ETIQUETA_TIPO_TARIFA: Record<string, string> = {
  fija: "Tarifa fija",
  variable: "Tarifa variable",
};

export default async function UsuariosPage() {
  await requireAdmin();
  const usuarios = await prisma.usuario.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <h1 className="font-display text-lg uppercase text-white">Usuarios</h1>
      <p className="mt-1 text-sm text-dc-muted">
        Lista blanca de personas autorizadas a entrar con Google o email.
        Los mentores (guest) necesitan una tarifa configurada antes de poder
        cargar horas facturables.
      </p>

      <NuevoUsuarioForm />

      <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
        <table className="w-full text-sm">
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="text-dc-text hover:text-dc-peri"
                  >
                    {u.nombre}
                  </Link>
                  <p className="text-xs text-dc-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-dc-line px-3 py-1 text-xs text-dc-text">
                    {ETIQUETA_ROL[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.rol === "guest" && (
                    <span
                      className={
                        u.tipoTarifa
                          ? BTN_PILL_ON
                          : "rounded-full bg-dc-pink/15 px-3 py-1 text-xs text-dc-pink"
                      }
                    >
                      {u.tipoTarifa
                        ? ETIQUETA_TIPO_TARIFA[u.tipoTarifa]
                        : "Sin tarifa configurada"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={alternarActivoUsuario.bind(null, u.id, !u.activo)}>
                    <button
                      type="submit"
                      className={
                        u.activo
                          ? BTN_PILL_ON
                          : BTN_PILL_OFF
                      }
                    >
                      {u.activo ? "Activo" : "Bloqueado"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={4}>
                  Todavía no hay usuarios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
