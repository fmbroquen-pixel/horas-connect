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
              className="rounded-lg border border-dc-line px-2 py-1 text-xs text-dc-muted hover:text-dc-text"
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
        <select name="clienteId" defaultValue={viatico.clienteId} className={INPUT}>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select name="etapaId" defaultValue={viatico.etapaId} className={INPUT}>
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select name="moneda" defaultValue={viatico.moneda} className={INPUT}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
        <input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={viatico.monto}
          required
          className={`${INPUT} text-right`}
        />
        <select name="concepto" defaultValue={viatico.concepto} className={INPUT}>
          {Object.entries(ETIQUETA_CONCEPTO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
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
      onClick={() => eliminarViatico(id)}
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
