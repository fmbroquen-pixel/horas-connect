"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearMiembro } from "../../actions";
import { OPCIONES_ROL_EQUIPO } from "../../constantes";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

// CTA "+ Agregar integrante" + modal de alta, mismo patrón que el resto de
// los modales de alta de la app (foco inicial, submit deshabilitado hasta
// completar, Esc/clic afuera para cerrar, toast al crear).
export function NuevoMiembroBoton({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [rol, setRol] = useState("");
  const [cumpleanos, setCumpleanos] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);

  const accion = crearMiembro.bind(null, clienteId);
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
    setApellido("");
    setRol("");
    setCumpleanos("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => nombreRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const valido =
    nombre.trim().length > 0 && apellido.trim().length > 0 && rol.length > 0;

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Agregar integrante
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-nuevo-miembro">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2
            id="titulo-nuevo-miembro"
            className="font-display text-sm uppercase text-white"
          >
            Nuevo integrante
          </h2>

          <form action={formAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Nombre</span>
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
                <span className={LABEL}>Apellido</span>
                <input
                  name="apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  autoComplete="off"
                  className={INPUT}
                />
              </label>
            </div>

            <div>
              <span className={LABEL}>Rol</span>
              <Dropdown
                name="rol"
                value={rol}
                onChange={setRol}
                options={OPCIONES_ROL_EQUIPO}
                placeholder="Elegí un rol"
                className="w-full"
                ariaLabel="Rol"
              />
            </div>

            <div>
              <span className={LABEL}>Fecha de cumpleaños</span>
              <DatePicker
                name="cumpleanos"
                value={cumpleanos}
                onChange={setCumpleanos}
                className="w-full"
                ariaLabel="Fecha de cumpleaños"
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
                {pending ? "Creando…" : "Agregar integrante"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Integrante agregado
      </ToastOk>
    </>
  );
}
