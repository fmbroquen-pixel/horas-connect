"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearTarea } from "../../actions";
import { OPCIONES_ESTADO_TAREA } from "../../constantes";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Alta de tarea/hito del cronograma: mismo patrón de modal que el resto de
// las altas de la app.
export function NuevaTareaBoton({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [responsable, setResponsable] = useState("");
  const tituloRef = useRef<HTMLInputElement>(null);

  const accion = crearTarea.bind(null, clienteId);
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
    setTitulo("");
    setInicio("");
    setFin("");
    setEstado("pendiente");
    setResponsable("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => tituloRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // La fecha de fin nunca puede quedar antes que la de inicio.
  const setInicioSeguro = (v: string) => {
    setInicio(v);
    if (fin && v && fin < v) setFin(v);
  };

  const valido = titulo.trim().length > 0 && inicio && fin;

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Agregar tarea
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-nueva-tarea">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-nueva-tarea"
            className="font-display text-sm uppercase text-white"
          >
            Nueva tarea
          </h2>

          <form action={formAction} className="mt-4 space-y-4">
            <label className="block">
              <span className={LABEL}>Título</span>
              <input
                ref={tituloRef}
                name="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                autoComplete="off"
                placeholder="Ej: Kickoff con el cliente"
                className={INPUT}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={LABEL}>Fecha de inicio</span>
                <DatePicker
                  name="fechaInicio"
                  value={inicio}
                  onChange={setInicioSeguro}
                  rangeStart={inicio}
                  rangeEnd={fin}
                  className="w-full"
                  ariaLabel="Fecha de inicio"
                />
              </div>
              <div>
                <span className={LABEL}>Fecha de fin</span>
                <DatePicker
                  name="fechaFin"
                  value={fin}
                  onChange={setFin}
                  rangeStart={inicio}
                  rangeEnd={fin}
                  min={inicio || undefined}
                  className="w-full"
                  ariaLabel="Fecha de fin"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={LABEL}>Estado</span>
                <Dropdown
                  name="estado"
                  value={estado}
                  onChange={setEstado}
                  options={OPCIONES_ESTADO_TAREA}
                  className="w-full"
                  ariaLabel="Estado"
                />
              </div>
              <label className="block">
                <span className={LABEL}>Responsable (opcional)</span>
                <input
                  name="responsable"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  autoComplete="off"
                  placeholder="Ej: Fede"
                  className={INPUT}
                />
              </label>
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
