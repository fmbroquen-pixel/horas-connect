"use client";

import { useActionState, useState } from "react";
import { actualizarViatico, eliminarViatico } from "./actions";
import { formatMonto, hoyISO } from "@/lib/formato";
import {
  GRID_VIATICOS,
  ETIQUETA_CONCEPTO,
  type OpcionSelect,
  type ViaticoFila,
} from "./tipos";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, BTN_DANGER_SM, BTN_DANGER_CONFIRM_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaViatico({
  viatico,
  proyectos,
  etapas,
}: {
  viatico: ViaticoFila;
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    const proyecto = proyectos.find((p) => p.id === viatico.clienteId);
    const etapa = etapas.find((e) => e.id === viatico.etapaId);
    return (
      <div className="border-b border-dc-line px-3 py-2 last:border-0">
        <div className={GRID_VIATICOS}>
          <span className="text-sm text-dc-text">{mostrarFecha(viatico.fecha)}</span>
          <span className="truncate text-sm text-dc-text">
            {proyecto?.nombre ?? "—"}
          </span>
          <span className="truncate text-sm text-dc-muted">
            {etapa?.nombre ?? "—"}
          </span>
          <span className="text-sm text-dc-muted">{viatico.moneda}</span>
          <span className="text-right text-sm tabular-nums text-dc-text">
            {formatMonto(viatico.monto)}
          </span>
          <span className="text-sm text-dc-muted">
            {ETIQUETA_CONCEPTO[viatico.concepto] ?? viatico.concepto}
          </span>
          <span className="text-sm">
            {viatico.archivoUrl ? (
              <a
                href={viatico.archivoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-dc-peri hover:text-dc-pink"
              >
                Ver archivo
              </a>
            ) : (
              <span className="text-dc-muted">—</span>
            )}
          </span>
          <span className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className={BTN_SECONDARY_SM}
            >
              Editar
            </button>
            <BotonEliminar id={viatico.id} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <FormEdicion
      viatico={viatico}
      proyectos={proyectos}
      etapas={etapas}
      onCerrar={() => setEditando(false)}
    />
  );
}

function FormEdicion({
  viatico,
  proyectos,
  etapas,
  onCerrar,
}: {
  viatico: ViaticoFila;
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  onCerrar: () => void;
}) {
  const [clienteId, setClienteId] = useState(viatico.clienteId);
  const [etapaId, setEtapaId] = useState(viatico.etapaId);
  const [moneda, setMoneda] = useState<string>(viatico.moneda);
  const [concepto, setConcepto] = useState(viatico.concepto);

  const accion = actualizarViatico.bind(null, viatico.id);
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
      <div className={GRID_VIATICOS}>
        <input
          name="fecha"
          type="date"
          defaultValue={viatico.fecha}
          required
          max={hoyISO()}
          className={INPUT}
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
          name="moneda"
          value={moneda}
          onChange={setMoneda}
          options={[
            { value: "ARS", label: "ARS" },
            { value: "USD", label: "USD" },
          ]}
          ariaLabel="Moneda"
        />
        <input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={viatico.monto}
          required
          className={`${INPUT} text-right`}
        />
        <Dropdown
          name="concepto"
          value={concepto}
          onChange={setConcepto}
          options={Object.entries(ETIQUETA_CONCEPTO).map(([valor, etiqueta]) => ({
            value: valor,
            label: etiqueta,
          }))}
          ariaLabel="Concepto"
        />
        <input
          name="archivo"
          type="file"
          accept="image/*,.pdf"
          className="text-xs text-dc-muted file:mr-1 file:rounded-lg file:border file:border-dc-line file:bg-dc-deeper file:px-2 file:py-1 file:text-xs file:text-dc-muted"
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
      onClick={() => eliminarViatico(id)}
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
