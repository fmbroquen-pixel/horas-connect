"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { BotonAgregar } from "@/components/ui/boton-agregar";
import {
  BotonCancelarIcono,
  BotonGuardarIcono,
} from "@/components/tabla/acciones-fila";
import { avisarOk } from "@/components/ui/avisos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";

export type CampoModal = { name: string; label: string; placeholder?: string };

type Accion = (
  prevState: { error?: string } | undefined,
  formData: FormData,
) => Promise<{ error?: string }>;

// Botón "Agregar…" + modal genérico para entidades de texto (Proyectos,
// Etapas). Misma lógica y estética que el alta de usuarios: foco inicial en
// el primer campo, submit deshabilitado hasta que todos los campos tengan
// valor, cierre con Esc/Cancelar/clic afuera, toast al crear y errores
// dentro del formulario.
export function AgregarModal({
  botonLabel,
  titulo,
  campos,
  action,
  toastMsg,
  submitLabel,
}: {
  // Va como tooltip del botón, ya sin el "+": el ícono lo dice.
  botonLabel: string;
  titulo: string;
  campos: CampoModal[];
  action: Accion;
  toastMsg: string;
  submitLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>();
  const primerRef = useRef<HTMLInputElement>(null);

  const [, formAction, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      const r = await action(undefined, fd);
      if (r.error) {
        setServerError(r.error);
        return r;
      }
      setOpen(false);
      setValores({});
      avisarOk(toastMsg);
      return r;
    },
    undefined,
  );

  const abrir = () => {
    setValores({});
    setServerError(undefined);
    setOpen(true);
  };
  const cerrar = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => primerRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);


  const valido = campos.every((c) => (valores[c.name] ?? "").trim().length > 0);

  return (
    <>
      <BotonAgregar etiqueta={botonLabel} onClick={abrir} />

      <Modal open={open} onClose={cerrar} labelledBy="titulo-agregar-modal">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-agregar-modal"
            className="font-display text-sm uppercase text-white"
          >
            {titulo}
          </h2>

          <form action={formAction} className="mt-4 space-y-4">
              {campos.map((c, i) => (
                <label key={c.name} className="block">
                  <span className="mb-1 block text-xs text-dc-muted">{c.label}</span>
                  <input
                    ref={i === 0 ? primerRef : undefined}
                    name={c.name}
                    value={valores[c.name] ?? ""}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [c.name]: e.target.value }))
                    }
                    placeholder={c.placeholder}
                    autoComplete="off"
                    className={INPUT}
                  />
                </label>
              ))}

              {serverError && (
                <p className="text-xs text-dc-pink" role="alert">
                  {serverError}
                </p>
              )}

              {/* En el modal la principal va a la derecha, que es donde se la
                  busca al terminar de completar. El orden es lo único que
                  cambia respecto de las filas; tamaño, separación y estados
                  son los mismos. */}
              <div className="flex justify-end gap-1 pt-1">
                <BotonCancelarIcono onClick={cerrar} />
                <BotonGuardarIcono
                  pending={pending}
                  disabled={!valido}
                  label={submitLabel}
                />
              </div>
            </form>
        </div>
      </Modal>

    </>
  );
}
