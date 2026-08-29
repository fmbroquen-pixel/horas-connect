"use client";

import { useActionState, useRef, useState } from "react";
import { actualizarDatosCliente, type CampoCliente } from "../actions";
import {
  OPCIONES_PRODUCTO,
  sumarMesesISO,
  mostrarFechaISO,
} from "../constantes";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { ToastOk } from "@/components/ui/toast-ok";
import { BotonGuardarIcono } from "@/components/tabla/acciones-fila";
import { useSeccionGuardable } from "@/components/guardado-pagina";

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
    valorCuotaUsd: string;
  };
}) {
  const [duracion, setDuracion] = useState(inicial.duracionMeses);
  const [producto, setProducto] = useState(inicial.producto);
  const [fechaInicio, setFechaInicio] = useState(inicial.fechaInicio);
  const [cuota, setCuota] = useState(inicial.valorCuotaUsd);
  const [toast, setToast] = useState(false);
  // Contador y no booleano: dos guardados seguidos tienen que pulsar dos veces.
  const [exito, setExito] = useState(0);

  const accion = actualizarDatosCliente.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(
    async (
      prev: { error?: string; campo?: CampoCliente } | undefined,
      formData: FormData,
    ) => {
      const r = await accion(prev, formData);
      if (!r.error) {
        setToast(true);
        setExito((n) => n + 1);
      }
      return r;
    },
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const [sucio, setSucio] = useState(false);
  const coordinado = useSeccionGuardable(
    "datos-cliente",
    "Datos del cliente",
    sucio,
    async () => {
      if (!formRef.current) return;
      const r = await accion(undefined, new FormData(formRef.current));
      if (r?.error) return { error: r.error };
      setSucio(false);
      setExito((n) => n + 1);
      setToast(true);
    },
  );

  // Fecha de finalización, siempre derivada (solo lectura).
  const meses = Number(duracion);
  const fechaFin =
    fechaInicio && Number.isInteger(meses) && meses >= 1
      ? sumarMesesISO(fechaInicio, meses)
      : null;

  const errorDe = (campo: CampoCliente) =>
    state?.campo === campo ? state.error : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setSucio(true)}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="block">
        <span className={LABEL}>Nombre del cliente</span>
        <input name="nombre" defaultValue={inicial.nombre} className={INPUT} />
        <ErrorCampo mensaje={errorDe("nombre")} />
        <p className="mt-1 text-xs text-dc-muted">
          Renombrar no afecta las horas, los viáticos ni el Roadmap ya
          cargados: cuelgan del identificador del cliente, no de su nombre.
        </p>
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
        <ErrorCampo mensaje={errorDe("producto")} />
      </div>

      <label className="block">
        <span className={LABEL}>Valor de la cuota (USD)</span>
        <input
          name="valorCuotaUsd"
          inputMode="decimal"
          autoComplete="off"
          value={cuota}
          onChange={(e) => setCuota(e.target.value)}
          placeholder="Ej: 1500,50"
          className={INPUT}
        />
        <ErrorCampo mensaje={errorDe("valorCuotaUsd")} />
      </label>

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
        <ErrorCampo mensaje={errorDe("duracionMeses")} />
      </label>

      <div>
        <span className={LABEL}>Fecha de inicio</span>
        <DatePicker
          name="fechaInicio"
          value={fechaInicio}
          onChange={(v) => {
            setFechaInicio(v);
            setSucio(true);
          }}
          className="w-full"
          ariaLabel="Fecha de inicio"
        />
        <ErrorCampo mensaje={errorDe("fechaInicio")} />
      </div>

      <div>
        <span className={LABEL}>Fecha de finalización</span>
        <div className={INPUT_RO} aria-label="Fecha de finalización (calculada)">
          {fechaFin ? mostrarFechaISO(fechaFin) : "—"}
        </div>
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        {/* El check queda para confirmaciones puntuales; el guardado de la
            pantalla es el boton violeta del pie, fuera de la card. */}
        {!coordinado && (
          <div className="flex justify-end">
            <BotonGuardarIcono pending={pending} label="Guardar datos" exito={exito} />
          </div>
        )}
        {/* Errores sin campo asociado; los que sí lo tienen se muestran
            debajo de su input. */}
        {state?.error && !state.campo && (
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

function ErrorCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p className="mt-1 text-xs text-dc-pink" role="alert">
      {mensaje}
    </p>
  );
}
