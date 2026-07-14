"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { crearVacacion } from "./actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

export const GRID_VACACIONES =
  "grid min-w-[560px] grid-cols-[150px_150px_120px_130px] items-center gap-2";

// Cantidad de días calendario entre dos fechas ISO, ambas inclusive.
function diasEntre(inicioISO: string, finISO: string): number | null {
  if (!inicioISO || !finISO) return null;
  const inicio = new Date(inicioISO + "T00:00:00");
  const fin = new Date(finISO + "T00:00:00");
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return null;
  return Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
}

// CTA "+ Registrar vacaciones" + modal con el mismo formulario de carga.
export function RegistrarVacacionesBoton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [dias, setDias] = useState("");
  const [diasEditado, setDiasEditado] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const inicioRef = useRef<HTMLInputElement>(null);

  const abrir = () => {
    setInicio("");
    setFin("");
    setDias("");
    setDiasEditado(false);
    setError(undefined);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inicioRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await crearVacacion(undefined, fd);
      if (!result.error) {
        setOpen(false);
        setToast(true);
      } else {
        setError(result.error);
      }
    });
  };

  const actualizarFechas = (nuevoInicio: string, nuevoFin: string) => {
    setInicio(nuevoInicio);
    setFin(nuevoFin);
    if (!diasEditado) {
      const calculados = diasEntre(nuevoInicio, nuevoFin);
      setDias(calculados !== null ? String(calculados) : "");
    }
  };

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Registrar vacaciones
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-registrar-vacaciones">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2 id="titulo-registrar-vacaciones" className="font-display text-sm uppercase text-white">
            Registrar vacaciones
          </h2>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={LABEL}>Fecha inicio</span>
                <input
                  ref={inicioRef}
                  name="fechaInicio"
                  type="date"
                  value={inicio}
                  onChange={(e) => actualizarFechas(e.target.value, fin)}
                  className={INPUT}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Fecha fin</span>
                <input
                  name="fechaFin"
                  type="date"
                  value={fin}
                  onChange={(e) => actualizarFechas(inicio, e.target.value)}
                  className={INPUT}
                />
              </label>
            </div>

            <label className="block">
              <span className={LABEL}>Días OOO</span>
              <input
                name="dias"
                type="number"
                min="1"
                step="1"
                placeholder="Días OOO"
                value={dias}
                onChange={(e) => {
                  setDias(e.target.value);
                  setDiasEditado(true);
                }}
                className={INPUT}
              />
              <span className="mt-1 block text-[11px] text-dc-muted">
                Se calcula solo a partir del rango; podés corregirlo (por ejemplo,
                para descontar fines de semana).
              </span>
            </label>

            {error && (
              <p className="text-xs text-dc-pink" role="alert">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pending ? "Registrando…" : "Registrar vacaciones"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Vacaciones registradas
      </ToastOk>
    </>
  );
}
