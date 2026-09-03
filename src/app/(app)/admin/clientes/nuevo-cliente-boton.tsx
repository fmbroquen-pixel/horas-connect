"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearCliente, type CampoCliente } from "./actions";
import {
  OPCIONES_PRODUCTO,
  sumarMesesISO,
  mostrarFechaISO,
} from "./constantes";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { BotonAgregar } from "@/components/ui/boton-agregar";
import {
  BotonCancelarIcono,
  BotonGuardarIcono,
} from "@/components/ui/acciones-fila";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_RO =
  "w-full cursor-not-allowed rounded-lg border border-dc-line bg-dc-deeper/60 px-3 py-2 text-sm text-dc-muted";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Alta de cliente. Pide todo lo que define al proyecto porque con la duración
// y la fecha de inicio el Roadmap se genera en el mismo alta; el resto
// completa la ficha para que ningún cliente quede a medio cargar.
export function NuevoClienteBoton() {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [producto, setProducto] = useState("");
  const [duracion, setDuracion] = useState("");
  const [inicio, setInicio] = useState("");
  const [cuota, setCuota] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);

  // La acción redirige a la ficha del cliente creado: acá solo se maneja el
  // camino de error.
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; campo?: CampoCliente } | undefined, fd: FormData) =>
      crearCliente(prev, fd),
    undefined,
  );

  const abrir = () => {
    setNombre("");
    setProducto("");
    setDuracion("");
    setInicio("");
    setCuota("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nombreRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const meses = Number(duracion);
  const cuotaNum = Number(cuota.replace(",", "."));

  const valido =
    nombre.trim().length > 0 &&
    producto !== "" &&
    Number.isInteger(meses) &&
    meses >= 1 &&
    inicio.length > 0 &&
    cuota.trim() !== "" &&
    Number.isFinite(cuotaNum) &&
    cuotaNum >= 0;

  // Fecha de finalización: siempre derivada, nunca se guarda.
  const fechaFin =
    inicio && Number.isInteger(meses) && meses >= 1
      ? sumarMesesISO(inicio, meses)
      : null;

  // El error del servidor se muestra debajo del input que lo produjo.
  const errorDe = (campo: CampoCliente) =>
    state?.campo === campo ? state.error : undefined;

  return (
    <>
      <BotonAgregar etiqueta="Agregar cliente" onClick={abrir} />

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-nuevo-cliente">
        <div className="dc-menu dc-pop-in w-full max-w-lg rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-nuevo-cliente"
            className="font-display text-sm uppercase text-white"
          >
            Nuevo cliente
          </h2>
          <p className="mt-1 text-xs text-dc-muted">
            Con la duración y la fecha de inicio se genera el Roadmap del
            proyecto: Onboarding más un tablero por trimestre.
          </p>

          <form action={formAction} className="mt-4 space-y-4">
            <label className="block">
              <span className={LABEL}>Nombre del cliente</span>
              <input
                ref={nombreRef}
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
                placeholder="Ej: Andreu"
                className={INPUT}
              />
              <ErrorCampo mensaje={errorDe("nombre")} />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Duración (meses)</span>
                <input
                  name="duracionMeses"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  autoComplete="off"
                  placeholder="Ej: 12"
                  className={INPUT}
                />
                <ErrorCampo mensaje={errorDe("duracionMeses")} />
              </label>

              <label className="block">
                <span className={LABEL}>Valor de la cuota (USD)</span>
                <input
                  name="valorCuotaUsd"
                  inputMode="decimal"
                  value={cuota}
                  onChange={(e) => setCuota(e.target.value)}
                  autoComplete="off"
                  placeholder="Ej: 1500,50"
                  className={INPUT}
                />
                <ErrorCampo mensaje={errorDe("valorCuotaUsd")} />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={LABEL}>Fecha de inicio</span>
                <DatePicker
                  name="fechaInicio"
                  value={inicio}
                  onChange={setInicio}
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
            </div>

            {/* Errores sin campo asociado (por ejemplo, fallas inesperadas). */}
            {state?.error && !state.campo && (
              <p className="text-xs text-dc-pink" role="alert">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-1 pt-1">
              <BotonCancelarIcono onClick={() => setOpen(false)} />
              <BotonGuardarIcono
                pending={pending}
                disabled={!valido}
                label="Crear cliente"
              />
            </div>
          </form>
        </div>
      </Modal>
    </>
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
