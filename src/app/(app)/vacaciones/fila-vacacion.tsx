"use client";

import { useActionState, useState } from "react";
import { actualizarVacacion, eliminarVacacion } from "./actions";
import { GRID_VACACIONES } from "./registrar-boton";
import { DatePicker } from "@/components/date-picker";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, BTN_DANGER_SM, BTN_DANGER_CONFIRM_SM } from "@/lib/ui";

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
          <span className="text-center text-sm text-dc-text">{mostrarFecha(vacacion.fechaInicio)}</span>
          <span className="text-center text-sm text-dc-text">{mostrarFecha(vacacion.fechaFin)}</span>
          <span className="text-center text-sm tabular-nums text-dc-text">
            {vacacion.dias}
          </span>
          <span className="flex justify-center gap-1">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className={BTN_SECONDARY_SM}
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
  const [inicio, setInicio] = useState(vacacion.fechaInicio);
  const [fin, setFin] = useState(vacacion.fechaFin);
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
        <DatePicker
          name="fechaInicio"
          value={inicio}
          onChange={setInicio}
          className="w-full"
          ariaLabel="Fecha inicio"
        />
        <DatePicker
          name="fechaFin"
          value={fin}
          onChange={setFin}
          className="w-full"
          ariaLabel="Fecha fin"
        />
        <input
          name="dias"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={vacacion.dias}
          required
          className={`${INPUT} text-right`}
        />
        <span className="flex justify-end gap-1">
          <button
            type="submit"
            disabled={pending}
            className={BTN_PRIMARY_SM}
          >
            {pending ? "…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className={BTN_SECONDARY_SM}
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
        className={BTN_DANGER_SM}
      >
        Borrar
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => eliminarVacacion(id)}
      className={BTN_DANGER_CONFIRM_SM}
    >
      ¿Seguro?
    </button>
  );
}

function mostrarFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
