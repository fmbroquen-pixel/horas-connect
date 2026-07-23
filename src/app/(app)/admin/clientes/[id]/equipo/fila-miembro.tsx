"use client";

import { useActionState, useState } from "react";
import { actualizarMiembro, eliminarMiembro } from "../../actions";
import {
  GRID_EQUIPO,
  ETIQUETA_ROL_EQUIPO,
  OPCIONES_ROL_EQUIPO,
  mostrarFechaISO,
  type MiembroFila,
} from "../../constantes";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import {
  BTN_PRIMARY_SM,
  BTN_SECONDARY_SM,
  BTN_DANGER_SM,
  BTN_DANGER_CONFIRM_SM,
} from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// Fila del equipo con edición inline, mismo patrón que las tablas de carga
// (Time Off): ver → Editar abre el formulario en la propia fila.
export function FilaMiembro({ miembro }: { miembro: MiembroFila }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="border-b border-dc-line px-3 py-2 last:border-0">
        <div className={GRID_EQUIPO}>
          <span className="truncate text-center text-sm text-dc-text">{miembro.nombre}</span>
          <span className="truncate text-center text-sm text-dc-text">{miembro.apellido}</span>
          <span className="truncate text-center text-sm text-dc-muted">
            {ETIQUETA_ROL_EQUIPO[miembro.rol] ?? miembro.rol}
          </span>
          <span className="text-center text-sm tabular-nums text-dc-text">
            {miembro.cumpleanos ? mostrarFechaISO(miembro.cumpleanos) : "—"}
          </span>
          <span className="flex justify-center gap-1">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className={BTN_SECONDARY_SM}
            >
              Editar
            </button>
            <BotonEliminar id={miembro.id} />
          </span>
        </div>
      </div>
    );
  }

  return <FormEdicion miembro={miembro} onCerrar={() => setEditando(false)} />;
}

function FormEdicion({
  miembro,
  onCerrar,
}: {
  miembro: MiembroFila;
  onCerrar: () => void;
}) {
  const [rol, setRol] = useState(miembro.rol);
  const [cumpleanos, setCumpleanos] = useState(miembro.cumpleanos);
  const accion = actualizarMiembro.bind(null, miembro.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await accion(prev, formData);
      if (!result.error) onCerrar();
      return result;
    },
    undefined,
  );

  return (
    <form
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-3 py-2 last:border-0"
    >
      <div className={GRID_EQUIPO}>
        <input
          name="nombre"
          defaultValue={miembro.nombre}
          aria-label="Nombre"
          autoComplete="off"
          required
          className={INPUT}
        />
        <input
          name="apellido"
          defaultValue={miembro.apellido}
          aria-label="Apellido"
          autoComplete="off"
          required
          className={INPUT}
        />
        <Dropdown
          name="rol"
          value={rol}
          onChange={setRol}
          options={OPCIONES_ROL_EQUIPO}
          ariaLabel="Rol"
        />
        <DatePicker
          name="cumpleanos"
          value={cumpleanos}
          onChange={setCumpleanos}
          className="w-full"
          ariaLabel="Fecha de cumpleaños"
        />
        <span className="flex justify-end gap-1">
          <button type="submit" disabled={pending} className={BTN_PRIMARY_SM}>
            {pending ? "…" : "Guardar"}
          </button>
          <button type="button" onClick={onCerrar} className={BTN_SECONDARY_SM}>
            ✕
          </button>
        </span>
      </div>
      {state?.error && <p className="mt-2 text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}

function BotonEliminar({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={BTN_DANGER_SM}
      >
        Borrar
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => eliminarMiembro(id)}
      className={BTN_DANGER_CONFIRM_SM}
    >
      ¿Seguro?
    </button>
  );
}
