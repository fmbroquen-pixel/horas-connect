"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

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
  const [toast, setToast] = useState(false);
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
      setToast(true);
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
    const t = setTimeout(() => primerRef.current?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const valido = campos.every((c) => (valores[c.name] ?? "").trim().length > 0);

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        {botonLabel}
      </button>

      {open && (
        <div
          className="dc-page-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={cerrar}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-agregar-modal"
            onClick={(e) => e.stopPropagation()}
            className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
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

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cerrar} className={BTN_SECONDARY}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!valido || pending}
                  className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {pending ? "Creando…" : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="dc-menu dc-pop-in fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-dc-line bg-dc-deep px-4 py-3 text-sm text-dc-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-peri" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {toastMsg}
        </div>
      )}
    </>
  );
}
