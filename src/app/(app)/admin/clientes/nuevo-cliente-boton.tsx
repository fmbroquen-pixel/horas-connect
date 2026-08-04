"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearCliente } from "./actions";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { DatePicker } from "@/components/date-picker";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Alta de cliente. A diferencia del AgregarModal genérico, acá la duración y
// la fecha de inicio son obligatorias: con ellas el cliente nace con su
// Roadmap ya generado (un tablero por trimestre, tareas encadenadas desde la
// fecha de inicio) y listo para recibir horas en Time Tracking.
export function NuevoClienteBoton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [nombre, setNombre] = useState("");
  const [duracion, setDuracion] = useState("");
  const [inicio, setInicio] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await crearCliente(prev, formData);
      if (!r.error) {
        setOpen(false);
        setToast(true);
      }
      return r;
    },
    undefined,
  );

  const abrir = () => {
    setNombre("");
    setDuracion("");
    setInicio("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nombreRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const valido =
    nombre.trim().length > 0 && Number(duracion) >= 1 && inicio.length > 0;

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Agregar cliente
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-nuevo-cliente">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
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
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Duración (meses)</span>
                <input
                  name="duracionMeses"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej: 12"
                  className={INPUT}
                />
              </label>
              <div>
                <span className={LABEL}>Fecha de inicio</span>
                <DatePicker
                  name="fechaInicio"
                  value={inicio}
                  onChange={setInicio}
                  className="w-full"
                  ariaLabel="Fecha de inicio"
                />
              </div>
            </div>

            {state?.error && (
              <p className="text-xs text-dc-pink" role="alert">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!valido || pending}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pending ? "Creando…" : "Crear cliente"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Cliente creado
      </ToastOk>
    </>
  );
}
