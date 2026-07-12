"use client";

import { useActionState, useState } from "react";
import { actualizarVacacion, eliminarVacacion } from "./actions";
import { GRID_VACACIONES } from "./fila-nueva";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export type VacacionFila = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
};

export function FilaVacacion({ vacacion }: { vacacion: VacacionFila }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="border-b border-dc-line px-3 py-2 last:border-0">
        <div className={GRID_VACACIONES}>
          <span className="text-sm text-dc-text">{mostrarFecha(vacacion.fechaInicio)}</span>
          <span className="text-sm text-dc-text">{mostrarFecha(vacacion.fechaFin)}</span>
          <span className="text-right text-sm tabular-nums text-dc-text">
            {vacacion.dias}
          </span>
          <span className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-text"
            >
              Editar
            </button>
            <BotonEliminar id={vacacion.id} />
          </span>
        </div>
      </div>
    );
  }

  return <FormEdicion vacacion={vacacion} onCerrar={() => setEditando(false)} />;
}

function FormEdicion({
  vacacion,
  onCerrar,
}: {
  vacacion: VacacionFila;
  onCerrar: () => void;
}) {
  const accion = actualizarVacacion.bind(null, vacacion.id);
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
      <div className={GRID_VACACIONES}>
        <input
          name="fechaInicio"
          type="date"
          defaultValue={vacacion.fechaInicio}
          required
          className={INPUT}
        />
        <input
          name="fechaFin"
          type="date"
          defaultValue={vacacion.fechaFin}
          required
          className={INPUT}
        />
        <input
          name="dias"
          type="number"
          min="1"
          step="1"
          defaultValue={vacacion.dias}
          required
          className={`${INPUT} text-right`}
        />
        <span className="flex justify-end gap-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-dc-purple px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-text"
          >
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
        className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-pink"
      >
        Borrar
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => eliminarVacacion(id)}
      className="rounded-lg bg-dc-pink/20 px-2 py-1 text-xs text-dc-pink"
    >
      ¿Seguro?
    </button>
  );
}

function mostrarFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
