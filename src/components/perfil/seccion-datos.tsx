import { RolDropdown } from "@/app/(app)/admin/usuarios/rol-dropdown";
import { IconoCandado, SoloLecturaBadge } from "@/components/ui/solo-lectura-badge";
import { BTN_SECONDARY } from "@/lib/ui";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Admin",
  guest: "Mentor",
  reader: "Solo lectura",
};

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_RO =
  "w-full cursor-not-allowed rounded-lg border border-dc-line bg-dc-deeper/60 px-3 py-2 text-sm text-dc-muted";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Sección "Mis datos" / "Datos del usuario". Misma estructura para admin y
// guest; solo varían el título (contextual), los permisos de edición y los
// indicadores de solo lectura. Pensada para escalar a futuras secciones.
export function SeccionDatosUsuario({
  titulo,
  soloLectura,
  usuario,
  action,
}: {
  titulo: string;
  soloLectura: boolean;
  usuario: { nombre: string; email: string; rol: string };
  action?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        {soloLectura && (
          <span className="text-dc-peri">
            <IconoCandado />
          </span>
        )}
        <h2 className="font-display text-sm uppercase text-white">{titulo}</h2>
        {soloLectura && <SoloLecturaBadge />}
      </div>

      {soloLectura ? (
        <>
          <p className="mt-1 text-xs text-dc-muted">
            Tu nombre, email y tipo de usuario los gestiona un administrador.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <span className={LABEL}>Nombre</span>
              <div className={INPUT_RO}>{usuario.nombre}</div>
            </div>
            <div>
              <span className={LABEL}>Email</span>
              <div className={INPUT_RO}>{usuario.email}</div>
            </div>
            <div>
              <span className={LABEL}>Tipo de usuario</span>
              <div className={INPUT_RO}>{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</div>
            </div>
          </div>
        </>
      ) : (
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={LABEL}>Nombre</span>
            <input name="nombre" defaultValue={usuario.nombre} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>Email</span>
            <input
              name="email"
              type="email"
              defaultValue={usuario.email}
              className={INPUT}
            />
          </label>
          <div>
            <span className={LABEL}>Tipo de usuario</span>
            <RolDropdown defaultValue={usuario.rol} className="w-full" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className={BTN_SECONDARY}>
              Guardar datos
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
