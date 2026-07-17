"use client";

import { useActionState, useState } from "react";
import { actualizarDatosCliente } from "../actions";
import {
  OPCIONES_PRODUCTO,
  sumarMesesISO,
  mostrarFechaISO,
} from "../constantes";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { ToastOk } from "@/components/ui/toast-ok";
import { BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_RO =
  "w-full cursor-not-allowed rounded-lg border border-dc-line bg-dc-deeper/60 px-3 py-2 text-sm text-dc-muted";
const LABEL = "mb-1 block text-xs text-dc-muted";

export function DatosClienteForm({
  clienteId,
  inicial,
}: {
  clienteId: string;
  inicial: {
    nombre: string;
    duracionMeses: string;
    producto: string;
    fechaInicio: string;
  };
}) {
  const [duracion, setDuracion] = useState(inicial.duracionMeses);
  const [producto, setProducto] = useState(inicial.producto);
  const [fechaInicio, setFechaInicio] = useState(inicial.fechaInicio);
  const [toast, setToast] = useState(false);

  const accion = actualizarDatosCliente.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
      if (!r.error) setToast(true);
      return r;
    },
    undefined,
  );

  // Fecha de finalización, siempre derivada (solo lectura).
  const meses = Number(duracion);
  const fechaFin =
    fechaInicio && Number.isInteger(meses) && meses >= 1
      ? sumarMesesISO(fechaInicio, meses)
      : null;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block">
        <span className={LABEL}>Nombre del cliente</span>
        <input name="nombre" defaultValue={inicial.nombre} className={INPUT} />
      </label>

      <div>
        <span className={LABEL}>Producto</span>
        <Dropdown
          name="producto"
          value={producto}
          onChange={setProducto}
          options={OPCIONES_PRODUCTO}
          placeholder="Elegí un producto"
          className="w-full"
          ariaLabel="Producto"
        />
      </div>

      <label className="block">
        <span className={LABEL}>Duración (meses)</span>
        <input
          name="duracionMeses"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          autoComplete="off"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          placeholder="Ej: 12"
          className={INPUT}
        />
      </label>

      <div>
        <span className={LABEL}>Fecha de inicio</span>
        <DatePicker
          name="fechaInicio"
          value={fechaInicio}
          onChange={setFechaInicio}
          className="w-full"
          ariaLabel="Fecha de inicio"
        />
      </div>

      <div>
        <span className={LABEL}>Fecha de finalización</span>
        <div className={INPUT_RO} aria-label="Fecha de finalización (calculada)">
          {fechaFin ? mostrarFechaISO(fechaFin) : "—"}
        </div>
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className={BTN_SECONDARY}>
          {pending ? "Guardando…" : "Guardar datos"}
        </button>
        {state?.error && (
          <p className="mt-2 text-xs text-dc-pink" role="alert">
            {state.error}
          </p>
        )}
      </div>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Datos guardados
      </ToastOk>
    </form>
  );
}
