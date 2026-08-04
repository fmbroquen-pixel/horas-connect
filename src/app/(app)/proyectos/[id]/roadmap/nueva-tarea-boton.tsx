"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearTarea } from "./actions";
import { OPCIONES_ESTADO } from "./constantes";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { Dropdown } from "@/components/dropdown";
import { reformatEntradaHoras } from "@/lib/horas";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Alta de tarea. No pide fechas a propósito: la tarea se agrega al final de
// la lista y la planificación secuencial le asigna el arranque a partir de la
// tarea anterior. Lo que define su lugar en el calendario es la duración.
export function NuevaTareaBoton({ listaId }: { listaId: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [nombre, setNombre] = useState("");
  const [duracion, setDuracion] = useState("1");
  const [horas, setHoras] = useState("1:00");
  const [estado, setEstado] = useState("sin_iniciar");
  const nombreRef = useRef<HTMLInputElement>(null);

  const accion = crearTarea.bind(null, listaId);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
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
    setDuracion("1");
    setHoras("1:00");
    setEstado("sin_iniciar");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nombreRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const valido = nombre.trim().length > 0 && Number(duracion) >= 1;

  return (
    <>
      {/* Fila de alta al pie de la lista (patrón ClickUp): discreta en
          reposo, se enciende al pasar por encima. */}
      <button
        type="button"
        onClick={abrir}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-dc-muted transition hover:bg-dc-card hover:text-dc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dc-peri/40"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar tarea
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-nueva-tarea-roadmap">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-nueva-tarea-roadmap"
            className="font-display text-sm uppercase text-white"
          >
            Nueva tarea
          </h2>
          <p className="mt-1 text-xs text-dc-muted">
            Se agrega al final de la lista y arranca el día hábil siguiente al
            fin de la tarea anterior.
          </p>

          <form action={formAction} className="mt-4 space-y-4">
            <label className="block">
              <span className={LABEL}>Nombre</span>
              <input
                ref={nombreRef}
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
                placeholder="Ej: Office Hours"
                className={INPUT}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Duración (días hábiles)</span>
                <input
                  name="duracionDias"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  className={INPUT}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Horas estimadas</span>
                <input
                  name="horasEstimadas"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  onBlur={() => {
                    const f = reformatEntradaHoras(horas);
                    if (f) setHoras(f);
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  title="Cargá un número (1,5) o el formato 1:30"
                  className={INPUT}
                />
              </label>
            </div>

            <div>
              <span className={LABEL}>Estado</span>
              <Dropdown
                name="estado"
                value={estado}
                onChange={setEstado}
                options={OPCIONES_ESTADO}
                className="w-full"
                ariaLabel="Estado"
              />
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
                {pending ? "Creando…" : "Agregar tarea"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Tarea agregada
      </ToastOk>
    </>
  );
}
