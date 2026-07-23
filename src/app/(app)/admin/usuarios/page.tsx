import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NuevoUsuarioBoton } from "./nuevo-usuario-form";
import { TAG_ON, TAG_OFF } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";
import { FiltroEstado, parseEstadoFiltro } from "@/components/admin/filtro-estado";
import { EditarLink } from "@/components/admin/editar-link";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Admin",
  guest: "Mentor",
  reader: "Solo lectura",
};

const ETIQUETA_TIPO_TARIFA: Record<string, string> = {
  fija: "Tarifa fija",
  variable: "Tarifa variable",
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireAdmin();
  const { estado: estadoParam } = await searchParams;
  const estado = parseEstadoFiltro(estadoParam);

  const usuarios = await prisma.usuario.findMany({
    where: estado === "todos" ? {} : { activo: estado === "activos" },
    orderBy: { nombre: "asc" },
  });

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

      <div className="mt-4 flex shrink-0 justify-end">
        <FiltroEstado basePath="/admin/usuarios" actual={estado} />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="w-[30%] px-4">Nombre de usuario</th>
              <th className="w-[20%] px-4">Tipo de usuario</th>
              <th className="w-[24%] px-4">Tarifa</th>
              <th className="w-[16%] px-4">Estado</th>
              <th className="w-[10%] px-4" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-3 text-center">
                  <p className="truncate text-dc-text">{u.nombre}</p>
                  <p className="truncate text-xs text-dc-muted">{u.email}</p>
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
                          ? TAG_ON
                          : "inline-flex items-center rounded-full bg-dc-pink/15 px-3 py-1 text-xs text-dc-pink"
                      }
                    >
                      {u.tipoTarifa
                        ? ETIQUETA_TIPO_TARIFA[u.tipoTarifa]
                        : "Sin tarifa configurada"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={u.activo ? TAG_ON : TAG_OFF}>
                    {u.activo ? "Activo" : "Bloqueado"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex justify-center">
                    <EditarLink href={`/admin/usuarios/${u.id}`} label="Editar usuario" />
                  </span>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={5}>
                  {estado === "todos"
                    ? "Todavía no hay usuarios cargados."
                    : "No hay usuarios que coincidan con este filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
