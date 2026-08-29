"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearUsuario } from "./actions";
import { RolDropdown } from "./rol-dropdown";
import { Modal } from "@/components/ui/modal";
import { BotonAgregar } from "@/components/ui/boton-agregar";
import {
  BotonCancelarIcono,
  BotonGuardarIcono,
} from "@/components/tabla/acciones-fila";
import { avisarOk } from "@/components/ui/avisos";

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
      avisarOk("Usuario creado");
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


  const valido = nombre.trim().length > 0 && emailValido(email);

  return (
    <>
      <BotonAgregar etiqueta="Agregar usuario" onClick={abrir} />

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

              <div className="flex justify-end gap-1 pt-1">
                <BotonCancelarIcono onClick={cerrar} />
                <BotonGuardarIcono
                  pending={pending}
                  disabled={!valido}
                  label="Crear usuario"
                />
              </div>
            </form>
        </div>
      </Modal>

    </>
  );
}
