import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { alternarActivoUsuario } from "./actions";
import { NuevoUsuarioBoton } from "./nuevo-usuario-form";
import { BTN_PILL_ON, BTN_PILL_OFF, BTN_SECONDARY_SM } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Admin",
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg uppercase text-white">Usuarios</h1>
          <InfoButton>
            Lista blanca de personas autorizadas a entrar con Google o email.
            Los usuarios solo los crea el administrador; nadie puede ingresar si
            no tiene un usuario creado. Los mentores (guest) necesitan una tarifa
            configurada antes de poder cargar horas facturables.
          </InfoButton>
        </div>
        <NuevoUsuarioBoton />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4 py-2 text-left">Nombre de usuario</th>
              <th className="px-4 py-2">Tipo de usuario</th>
              <th className="px-4 py-2">Tarifa</th>
              <th className="px-4 py-2">Activo</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <p className="text-dc-text">{u.nombre}</p>
                  <p className="text-xs text-dc-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-dc-line px-3 py-1 text-xs text-dc-text">
                    {ETIQUETA_ROL[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {(u.rol === "guest" || u.rol === "admin") && (
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
                <td className="px-4 py-3 text-center">
                  <form action={alternarActivoUsuario.bind(null, u.id, !u.activo)}>
                    <button type="submit" className={u.activo ? BTN_PILL_ON : BTN_PILL_OFF}>
                      {u.activo ? "Activo" : "Bloqueado"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/usuarios/${u.id}`} className={BTN_SECONDARY_SM}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={5}>
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
