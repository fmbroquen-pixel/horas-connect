"use client";

import { useActionState, useState } from "react";
import { actualizarRegistro, eliminarRegistro } from "./actions";
import { parseHorasHsMin } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import {
  ETIQUETA_MODALIDAD,
  ETIQUETA_OWNERSHIP,
  type MapaTarifas,
  type OpcionSelect,
  type RegistroFila,
} from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaRegistro({
  registro,
  proyectos,
  etapas,
  tarifas,
}: {
  registro: RegistroFila;
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    const proyecto = proyectos.find((p) => p.id === registro.clienteId);
    const etapa = etapas.find((e) => e.id === registro.etapaId);
    return (
      <div className="border-b border-dc-line px-3 py-2 last:border-0">
        <div className={GRID_TIMETRACKER}>
          <span className="text-sm text-dc-text">{mostrarFecha(registro.fecha)}</span>
          <span className="truncate text-sm text-dc-text">
            {proyecto?.nombre ?? "—"}
          </span>
          <span className="truncate text-sm text-dc-muted">
            {etapa?.nombre ?? "—"}
          </span>
          <span className="text-sm text-dc-muted">
            {ETIQUETA_OWNERSHIP[registro.ownership]}
          </span>
          <span className="text-sm tabular-nums text-dc-text">{registro.horas}</span>
          <span className="text-sm text-dc-muted">
            {ETIQUETA_MODALIDAD[registro.modalidad]}
          </span>
          <span className="text-right text-sm tabular-nums text-dc-muted">
            {formatMonto(registro.tarifaUsd)}
          </span>
          <span className="text-right text-sm tabular-nums text-dc-text">
            {formatMonto(registro.montoUsd)}
          </span>
          <span className="flex justify-end gap-1">
            {registro.editable ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-text"
                >
                  Editar
                </button>
                <BotonEliminar id={registro.id} />
              </>
            ) : (
              <span className="text-xs text-dc-muted" title="Pasados 30 días el registro queda fijo">
                Cerrado
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <FormEdicion
      registro={registro}
      proyectos={proyectos}
      etapas={etapas}
      tarifas={tarifas}
      onCerrar={() => setEditando(false)}
    />
  );
}

function FormEdicion({
  registro,
  proyectos,
  etapas,
  tarifas,
  onCerrar,
}: {
  registro: RegistroFila;
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
  onCerrar: () => void;
}) {
  const [modalidad, setModalidad] = useState<string>(registro.modalidad);
  const [ownership, setOwnership] = useState<string>(registro.ownership);
  const [horas, setHoras] = useState(registro.horas);

  const accion = actualizarRegistro.bind(null, registro.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await accion(prev, formData);
      if (!result.error) onCerrar();
      return result;
    },
    undefined,
  );

  const tarifa = tarifas[`${modalidad}-${ownership}`];
  const horasDecimal = parseHorasHsMin(horas);
  const total =
    tarifa !== undefined && horasDecimal !== null && horasDecimal > 0
      ? tarifa * horasDecimal
      : null;

  return (
    <form
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-3 py-2 last:border-0"
    >
      <div className={GRID_TIMETRACKER}>
        <input
          name="fecha"
          type="date"
          defaultValue={registro.fecha}
          required
          max={hoyISO()}
          className={INPUT}
        />
        <select name="clienteId" defaultValue={registro.clienteId} className={INPUT}>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select name="etapaId" defaultValue={registro.etapaId} className={INPUT}>
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select
          name="ownership"
          value={ownership}
          onChange={(e) => setOwnership(e.target.value)}
          className={INPUT}
        >
          <option value="owner">Owner</option>
          <option value="backup">Backup</option>
        </select>
        <input
          name="horas"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          required
          className={INPUT}
        />
        <select
          name="modalidad"
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          className={INPUT}
        >
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
        <span className="text-right text-sm tabular-nums text-dc-muted">
          {tarifa !== undefined ? formatMonto(tarifa) : "—"}
        </span>
        <span className="text-right text-sm tabular-nums text-dc-text">
          {total !== null ? formatMonto(total) : "—"}
        </span>
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
      onClick={() => eliminarRegistro(id)}
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
