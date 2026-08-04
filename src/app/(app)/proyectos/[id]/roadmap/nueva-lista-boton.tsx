"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearLista } from "./actions";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { Dropdown } from "@/components/dropdown";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Las plantillas son solo un punto de partida: al crearse, las tareas se
// copian a la lista del proyecto y desde ahí viven por su cuenta.
const OPCIONES_PLANTILLA = [
  { value: "", label: "Lista vacía" },
  { value: "Onboarding", label: "Onboarding" },
  { value: "Tablero Trimestral", label: "Tablero Trimestral" },
];

export function NuevaListaBoton({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [nombre, setNombre] = useState("");
  const [plantilla, setPlantilla] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);

  const accion = crearLista.bind(null, clienteId);
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
    setPlantilla("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nombreRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Elegir una plantilla propone su nombre, pero se puede cambiar.
  const elegirPlantilla = (v: string) => {
    setPlantilla(v);
    if (v && !nombre.trim()) setNombre(v);
  };

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Agregar lista
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-nueva-lista">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2 id="titulo-nueva-lista" className="font-display text-sm uppercase text-white">
            Nueva lista
          </h2>

          <form action={formAction} className="mt-4 space-y-4">
            <div>
              <span className={LABEL}>Arrancar desde</span>
              <Dropdown
                name="plantilla"
                value={plantilla}
                onChange={elegirPlantilla}
                options={OPCIONES_PLANTILLA}
                className="w-full"
                ariaLabel="Plantilla"
              />
              <p className="mt-1 text-xs text-dc-muted">
                Las tareas de la plantilla se copian a este proyecto: después
                se editan acá sin afectar a otros clientes.
              </p>
            </div>

            <label className="block">
              <span className={LABEL}>Nombre de la lista</span>
              <input
                ref={nombreRef}
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
                placeholder="Ej: Tablero Q3"
                className={INPUT}
              />
            </label>

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
                disabled={nombre.trim().length === 0 || pending}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pending ? "Creando…" : "Agregar lista"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Lista agregada
      </ToastOk>
    </>
  );
}
