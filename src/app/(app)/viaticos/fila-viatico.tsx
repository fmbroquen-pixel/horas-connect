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
import {
  BotonCancelarIcono,
  BotonEditarIcono,
  BotonEliminarIcono,
  BotonGuardarIcono,
} from "@/components/tabla/acciones-fila";
import { MarcaEdicion } from "@/components/tabla/marca-edicion";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaViatico({
  viatico,
  proyectos,
}: {
  viatico: ViaticoFila;
  proyectos: OpcionSelect[];
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    const proyecto = proyectos.find((p) => p.id === viatico.clienteId);
    return (
      <div className="border-b border-dc-line px-3 py-2 last:border-0">
        <div className={GRID_VIATICOS}>
          <span className="text-center text-sm text-dc-text">{mostrarFecha(viatico.fecha)}</span>
          <span className="truncate text-center text-sm text-dc-text">
            {proyecto?.nombre ?? "—"}
          </span>
          <span className="text-center text-sm text-dc-muted">
            {ETIQUETA_CONCEPTO[viatico.concepto] ?? viatico.concepto}
          </span>
          <span className="text-center text-sm text-dc-muted">{viatico.moneda}</span>
          <span className="text-center text-sm tabular-nums text-dc-text">
            {formatMonto(viatico.monto)}
          </span>
          <span className="text-center text-sm">
            {viatico.archivoUrl ? (
              <a
                href={viatico.archivoUrl}
                target="_blank"
                rel="noreferrer"
                title="Ver comprobante"
                className="inline-flex text-dc-peri hover:text-dc-pink"
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </a>
            ) : (
              <span className="text-dc-muted">—</span>
            )}
          </span>
          {/* Editar → Eliminar, el mismo par y el mismo orden que Time
              Tracking. Solo íconos: el texto de estas dos acciones se repetía
              en cada fila y competía con los datos, que es lo que hay que
              leer. */}
          <span className="flex items-center justify-center gap-1">
            <MarcaEdicion detalle={viatico.edicion} />
            <BotonEditarIcono onClick={() => setEditando(true)} />
            <BotonEliminarIcono
              onConfirm={() => eliminarViatico(viatico.id)}
              mensaje="Viático enviado a papelera"
            />
          </span>
        </div>
      </div>
    );
  }

  return (
    <FormEdicion
      viatico={viatico}
      proyectos={proyectos}
      onCerrar={() => setEditando(false)}
    />
  );
}

function FormEdicion({
  viatico,
  proyectos,
  onCerrar,
}: {
  viatico: ViaticoFila;
  proyectos: OpcionSelect[];
  onCerrar: () => void;
}) {
  const [fecha, setFecha] = useState(viatico.fecha);
  const [clienteId, setClienteId] = useState(viatico.clienteId);
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
          ariaLabel="Cliente"
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
        <input
          name="archivo"
          type="file"
          accept="image/*,.pdf"
          aria-label="Comprobante"
          className="text-xs text-dc-muted file:mr-1 file:rounded-lg file:border file:border-dc-line file:bg-dc-deeper file:px-2 file:py-1 file:text-xs file:text-dc-muted"
        />
        {/* Mismo par que en modo lectura: la acción principal primero, la
            secundaria después, con el mismo tamaño y separación. */}
        <span className="flex justify-center gap-1">
          <BotonGuardarIcono pending={pending} />
          <BotonCancelarIcono onClick={onCerrar} />
        </span>
      </div>
      {state?.error && <p className="mt-2 text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}

function mostrarFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
