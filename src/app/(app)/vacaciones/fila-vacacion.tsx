"use client";

import { useActionState, useState } from "react";
import { actualizarVacacion, eliminarVacacion } from "./actions";
import { GRID_VACACIONES, diasHabilesEntre } from "./registrar-boton";
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
  const [dias, setDias] = useState(String(vacacion.dias));
  const [diasEditado, setDiasEditado] = useState(false);
  const accion = actualizarVacacion.bind(null, vacacion.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await accion(prev, formData);
      if (!result.error) onCerrar();
      return result;
    },
    undefined,
  );

  const actualizarFechas = (nuevoInicio: string, finPropuesto: string) => {
    // La fecha de fin nunca puede ser anterior a la de inicio: se corrige
    // automáticamente en vez de dejar guardar un rango inválido.
    const nuevoFin =
      nuevoInicio && finPropuesto && finPropuesto < nuevoInicio
        ? nuevoInicio
        : finPropuesto;
    setInicio(nuevoInicio);
    setFin(nuevoFin);
    if (!diasEditado) {
      const calculados = diasHabilesEntre(nuevoInicio, nuevoFin);
      setDias(calculados !== null ? String(calculados) : "");
    }
  };

  return (
    <form
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-3 py-2 last:border-0"
    >
      <div className={GRID_VACACIONES}>
        <DatePicker
          name="fechaInicio"
          value={inicio}
          onChange={(v) => actualizarFechas(v, fin)}
          rangeStart={inicio}
          rangeEnd={fin}
          className="w-full"
          ariaLabel="Fecha inicio"
        />
        <DatePicker
          name="fechaFin"
          value={fin}
          onChange={(v) => actualizarFechas(inicio, v)}
          rangeStart={inicio}
          rangeEnd={fin}
          min={inicio || undefined}
          className="w-full"
          ariaLabel="Fecha fin"
        />
        <div className="relative">
          <input
            name="dias"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Días OOO"
            value={dias}
            onChange={(e) => {
              setDias(e.target.value);
              setDiasEditado(true);
            }}
            required
            className={`${INPUT} ${diasEditado ? "pr-7" : ""} text-right`}
          />
          {diasEditado && (
            <button
              type="button"
              title="Recalcular automáticamente"
              aria-label="Recalcular automáticamente"
              onClick={() => {
                setDiasEditado(false);
                const calculados = diasHabilesEntre(inicio, fin);
                setDias(calculados !== null ? String(calculados) : "");
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-dc-muted transition hover:text-dc-peri"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          )}
        </div>
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
