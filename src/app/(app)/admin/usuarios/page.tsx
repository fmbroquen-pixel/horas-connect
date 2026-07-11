import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarUsuario, alternarActivoUsuario } from "./actions";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";

export default async function UsuariosPage() {
  await requireAdmin();
  const [usuarios, mentores] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: { nombre: "asc" },
      include: { mentor: true },
    }),
    prisma.mentor.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-lg uppercase text-white">Usuarios</h1>
      <p className="mt-1 text-sm text-dc-muted">
        Lista blanca de personas autorizadas a entrar con Google o email.
      </p>

      <NuevoUsuarioForm mentores={mentores} />

      <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
        <table className="w-full text-sm">
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3">
                  <form
                    action={actualizarUsuario.bind(null, u.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      name="nombre"
                      defaultValue={u.nombre}
                      className="w-32 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-dc-text outline-none focus:border-dc-peri"
                    />
                    <input
                      name="email"
                      type="email"
                      defaultValue={u.email}
                      className="w-48 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-muted outline-none focus:border-dc-peri"
                    />
                    <select
                      name="rol"
                      defaultValue={u.rol}
                      className="rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-text outline-none focus:border-dc-peri"
                    >
                      <option value="guest">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      name="mentorId"
                      defaultValue={u.mentorId ?? ""}
                      className="rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-xs text-dc-text outline-none focus:border-dc-peri"
                    >
                      <option value="">Sin vincular</option>
                      {mentores.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-text"
                    >
                      Guardar
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={alternarActivoUsuario.bind(null, u.id, !u.activo)}>
                    <button
                      type="submit"
                      className={
                        u.activo
                          ? "rounded-full bg-dc-peri/20 px-3 py-1 text-xs text-dc-peri"
                          : "rounded-full bg-dc-line px-3 py-1 text-xs text-dc-muted"
                      }
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={2}>
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
