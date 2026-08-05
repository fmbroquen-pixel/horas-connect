"use client";

import { useActionState, useState } from "react";
import { guardarProyectosAsignados } from "../actions";
import {
  MAX_BACKUPS,
  type ProyectoAsignable,
  type RolAsignacion,
} from "../constantes";
import { ToastOk } from "@/components/ui/toast-ok";
import { BTN_SECONDARY } from "@/lib/ui";

const SOLAPAS: { rol: RolAsignacion; label: string }[] = [
  { rol: "owner", label: "Mentor Owner" },
  { rol: "backup", label: "Mentor Backup" },
];

// Asignación de proyectos por rol. Las dos solapas comparten un único estado
// y un único submit: son dos vistas de la misma decisión (qué rol tiene este
// usuario en cada proyecto), no dos formularios independientes.
//
// Las reglas —un owner por proyecto, hasta dos backups, nadie en los dos
// roles— se bloquean acá para que el problema se vea antes de guardar, y se
// vuelven a validar en el servidor: deshabilitar un checkbox no impide que
// alguien mande el dato igual.
export function ProyectosForm({
  usuarioId,
  proyectos,
}: {
  usuarioId: string;
  proyectos: ProyectoAsignable[];
}) {
  const [solapa, setSolapa] = useState<RolAsignacion>("owner");
  const [roles, setRoles] = useState<Map<string, RolAsignacion>>(
    () =>
      new Map(
        proyectos
          .filter((p) => p.rolPropio !== "")
          .map((p) => [p.id, p.rolPropio as RolAsignacion]),
      ),
  );
  const [toast, setToast] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean } | undefined, fd: FormData) => {
      const r = await guardarProyectosAsignados(usuarioId, prev, fd);
      if (r.ok) setToast(true);
      return r;
    },
    undefined,
  );

  // Marcar en una solapa desmarca la otra: un usuario tiene un solo rol por
  // proyecto, así que la exclusión es automática y no un error a mostrar.
  const alternar = (id: string, rol: RolAsignacion) =>
    setRoles((m) => {
      const n = new Map(m);
      if (n.get(id) === rol) n.delete(id);
      else n.set(id, rol);
      return n;
    });

  // Motivo por el que un proyecto no puede tomarse en este rol, o null.
  const bloqueo = (p: ProyectoAsignable, rol: RolAsignacion): string | null => {
    if (rol === "owner") {
      return p.ownerAjeno ? `Owner: ${p.ownerAjeno}` : null;
    }
    const cupo = MAX_BACKUPS - p.backupsAjenos.length;
    return cupo <= 0 ? `Backups completos: ${p.backupsAjenos.join(", ")}` : null;
  };

  const contar = (rol: RolAsignacion) =>
    [...roles.values()].filter((r) => r === rol).length;

  const sinRol = proyectos.filter((p) => p.sinRol && !roles.has(p.id));

  return (
    <form action={formAction}>
      {/* La solapa inactiva no está en el DOM, así que lo elegido se serializa
          acá: el submit manda las dos listas completas de una sola vez. */}
      {[...roles.entries()].map(([clienteId, rol]) => (
        <input key={clienteId} type="hidden" name={rol} value={clienteId} />
      ))}

      <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-dc-line bg-dc-deeper p-1">
        {SOLAPAS.map((s) => {
          const activa = s.rol === solapa;
          return (
            <button
              key={s.rol}
              type="button"
              onClick={() => setSolapa(s.rol)}
              aria-pressed={activa}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                activa
                  ? "bg-dc-peri/20 text-dc-text"
                  : "text-dc-muted hover:text-dc-text"
              }`}
            >
              {s.label} ({contar(s.rol)})
            </button>
          );
        })}
      </div>

      {sinRol.length > 0 && (
        <p className="mb-3 rounded-xl border border-dc-peri/40 bg-dc-peri/10 px-3 py-2 text-xs text-dc-text">
          {sinRol.length} proyecto(s) asignados antes de que existieran los
          roles: {sinRol.map((p) => p.nombre).join(", ")}. Conservan el permiso
          de cargar horas; elegiles una solapa para completarlos.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {proyectos.map((p) => {
          const propio = roles.get(p.id);
          const marcado = propio === solapa;
          const motivo = bloqueo(p, solapa);
          const deshabilitado = motivo !== null && !marcado;

          return (
            <label
              key={p.id}
              title={motivo ?? undefined}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                deshabilitado
                  ? "cursor-not-allowed border-dc-line/60 text-dc-muted opacity-60"
                  : "cursor-pointer border-dc-line text-dc-text hover:border-dc-peri"
              }`}
            >
              <input
                type="checkbox"
                checked={marcado}
                disabled={deshabilitado}
                onChange={() => alternar(p.id, solapa)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-dc-purple"
              />
              <span className="min-w-0">
                <span className="block truncate">{p.nombre}</span>
                {propio && propio !== solapa && (
                  <span className="block text-[11px] text-dc-peri">
                    Asignado como {propio === "owner" ? "Owner" : "Backup"}
                  </span>
                )}
                {motivo && (
                  <span className="block truncate text-[11px] text-dc-muted">
                    {motivo}
                  </span>
                )}
                {p.sinRol && !propio && (
                  <span className="block text-[11px] text-dc-muted">
                    Asignado sin rol
                  </span>
                )}
              </span>
            </label>
          );
        })}

        {proyectos.length === 0 && (
          <p className="text-sm text-dc-muted">No hay proyectos activos.</p>
        )}
      </div>

      {state?.error && (
        <p className="mt-3 text-xs text-dc-pink" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${BTN_SECONDARY} mt-4`}>
        {pending ? "Guardando…" : "Guardar clientes asignados"}
      </button>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Asignaciones guardadas
      </ToastOk>
    </form>
  );
}
