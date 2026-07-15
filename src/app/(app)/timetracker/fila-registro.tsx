"use client";

import { useActionState, useState } from "react";
import { actualizarRegistro, eliminarRegistro } from "./actions";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import {
  ETIQUETA_MODALIDAD,
  ETIQUETA_OWNERSHIP,
  type MapaTarifas,
  type OpcionSelect,
  type RegistroFila,
} from "./tipos";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, BTN_DANGER_SM, BTN_DANGER_CONFIRM_SM } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaRegistro({
  registro,
  proyectos,
  etapas,
  tarifas,
  seleccionado,
  onToggle,
}: {
  registro: RegistroFila;
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
  seleccionado: boolean;
  onToggle: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    const proyecto = proyectos.find((p) => p.id === registro.clienteId);
    const etapa = etapas.find((e) => e.id === registro.etapaId);
    return (
      <div className="border-b border-dc-line px-3 py-2 last:border-0">
        <div className={GRID_TIMETRACKER}>
          {registro.editable ? (
            <input
              type="checkbox"
              checked={seleccionado}
              onChange={() => onToggle(registro.id)}
              className="h-4 w-4 accent-dc-purple"
              aria-label="Seleccionar fila"
            />
          ) : (
            <span />
          )}
          <span className="text-center text-sm text-dc-text">{mostrarFecha(registro.fecha)}</span>
          <span className="truncate text-center text-sm text-dc-text">
            {proyecto?.nombre ?? "—"}
          </span>
          <span className="truncate text-center text-sm text-dc-muted">
            {etapa?.nombre ?? "—"}
          </span>
          <span className="text-center text-sm text-dc-muted">
            {ETIQUETA_OWNERSHIP[registro.ownership]}
          </span>
          <span className="text-center text-sm tabular-nums text-dc-text">{registro.horas}</span>
          <span className="text-center text-sm text-dc-muted">
            {ETIQUETA_MODALIDAD[registro.modalidad]}
          </span>
          <span className="text-center text-sm tabular-nums text-dc-muted">
            {formatMonto(registro.tarifaUsd)}
          </span>
          <span className="text-center text-sm tabular-nums text-dc-text">
            {formatMonto(registro.montoUsd)}
          </span>
          <span className="flex justify-center gap-1">
            {registro.editable ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className={BTN_SECONDARY_SM}
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
  const [fecha, setFecha] = useState(registro.fecha);
  const [clienteId, setClienteId] = useState(registro.clienteId);
  const [etapaId, setEtapaId] = useState(registro.etapaId);
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
        <span />
        <DatePicker
          name="fecha"
          value={fecha}
          onChange={setFecha}
          max={hoyISO()}
          className="w-full"
          ariaLabel="Fecha"
        />
        <Dropdown
          name="clienteId"
          value={clienteId}
          onChange={setClienteId}
          options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
          ariaLabel="Proyecto"
        />
        <Dropdown
          name="etapaId"
          value={etapaId}
          onChange={setEtapaId}
          options={etapas.map((e) => ({ value: e.id, label: e.nombre }))}
          ariaLabel="Etapa"
        />
        <Dropdown
          name="ownership"
          value={ownership}
          onChange={setOwnership}
          options={[
            { value: "owner", label: "Owner" },
            { value: "backup", label: "Backup" },
          ]}
          ariaLabel="Ownership"
        />
        <input
          name="horas"
          value={horas}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setHoras(e.target.value)}
          onBlur={() => {
            const f = reformatEntradaHoras(horas);
            if (f) setHoras(f);
          }}
          required
          className={INPUT}
        />
        <Dropdown
          name="modalidad"
          value={modalidad}
          onChange={setModalidad}
          options={[
            { value: "presencial", label: "Presencial" },
            { value: "virtual", label: "Virtual" },
          ]}
          ariaLabel="Modalidad"
        />
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
      onClick={() => eliminarRegistro(id)}
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
