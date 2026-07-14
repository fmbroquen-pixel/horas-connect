"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearUsuario } from "./actions";
import { RolDropdown } from "./rol-dropdown";
import { Modal } from "@/components/ui/modal";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

// Botón "Agregar usuario" + modal de creación. Reemplaza la fila fija de
// inputs para liberar alto vertical y dar protagonismo a la tabla.
export function NuevoUsuarioBoton() {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string>();
  const [toast, setToast] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);

  const [, formAction, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      const r = await crearUsuario(undefined, fd);
      if (r.error) {
        setServerError(r.error);
        return r;
      }
      setOpen(false);
      setNombre("");
      setEmail("");
      setToast(true);
      return r;
    },
    undefined,
  );

  const abrir = () => {
    setNombre("");
    setEmail("");
    setServerError(undefined);
    setOpen(true);
  };
  const cerrar = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    // Foco inicial en Nombre.
    const t = setTimeout(() => nombreRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const valido = nombre.trim().length > 0 && emailValido(email);

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Agregar usuario
      </button>

      <Modal open={open} onClose={cerrar} labelledBy="titulo-nuevo-usuario">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-nuevo-usuario"
            className="font-display text-sm uppercase text-white"
          >
            Nuevo usuario
          </h2>

          <form action={formAction} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs text-dc-muted">Nombre</span>
                <input
                  ref={nombreRef}
                  name="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="off"
                  className={INPUT}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-dc-muted">Email</span>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@embarca.tech"
                  autoComplete="off"
                  className={INPUT}
                />
              </label>

              <div>
                <span className="mb-1 block text-xs text-dc-muted">
                  Tipo de usuario
                </span>
                <RolDropdown className="w-full" />
              </div>

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
                  {pending ? "Creando…" : "Crear usuario"}
                </button>
              </div>
            </form>
        </div>
      </Modal>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="dc-menu dc-pop-in fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-dc-line bg-dc-deep px-4 py-3 text-sm text-dc-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-peri" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Usuario creado
        </div>
      )}
    </>
  );
}
