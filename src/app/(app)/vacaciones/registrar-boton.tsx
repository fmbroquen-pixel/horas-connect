"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { crearVacacion } from "./actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { Modal } from "@/components/ui/modal";
import { ToastOk } from "@/components/ui/toast-ok";
import { ToastAviso } from "@/components/ui/toast-aviso";
import { DatePicker } from "@/components/date-picker";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";
const LABEL = "mb-1 block text-xs text-dc-muted";

// Columnas fluidas con mínimo (como Time Tracking y Expenses): se reparten
// todo el ancho del panel de forma pareja, con o sin registros, en vez de
// comprimirse a la izquierda. La de acciones queda fija.
export const GRID_VACACIONES =
  "grid min-w-[560px] grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,1fr)_150px] items-center gap-3";

// Cantidad de días hábiles (excluye sábados y domingos) entre dos fechas ISO,
// ambas inclusive. Es el cálculo por defecto de "Días OOO"; el usuario puede
// editarlo a mano para contemplar feriados u otras excepciones.
export function diasHabilesEntre(inicioISO: string, finISO: string): number | null {
  if (!inicioISO || !finISO) return null;
  const inicio = new Date(inicioISO + "T00:00:00");
  const fin = new Date(finISO + "T00:00:00");
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return null;
  let dias = 0;
  const cur = new Date(inicio);
  while (cur <= fin) {
    const diaSemana = cur.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    cur.setDate(cur.getDate() + 1);
  }
  return dias;
}

// CTA "+ Nueva solicitud" + modal con el mismo formulario de carga.
export function RegistrarVacacionesBoton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [dias, setDias] = useState("");
  const [diasEditado, setDiasEditado] = useState(false);
  const [campoError, setCampoError] = useState<string>();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const abrir = () => {
    setInicio("");
    setFin("");
    setDias("");
    setDiasEditado(false);
    setCampoError(undefined);
    setOpen(true);
  };

  const enfocar = (campo: string) => {
    const cont = formRef.current?.querySelector(`[data-campo="${campo}"]`);
    (cont?.querySelector("button, input") as HTMLElement | undefined)?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => enfocar("fechaInicio"), 60);
    return () => clearTimeout(t);
  }, [open]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const faltante = !inicio.trim()
      ? { campo: "fechaInicio", label: "Fecha inicio" }
      : !fin.trim()
        ? { campo: "fechaFin", label: "Fecha fin" }
        : !dias.trim()
          ? { campo: "dias", label: "Días OOO" }
          : null;
    if (faltante) {
      setCampoError(faltante.campo);
      setAviso(`Completá el campo "${faltante.label}" para guardar la solicitud.`);
      enfocar(faltante.campo);
      return;
    }
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await crearVacacion(undefined, fd);
      if (!result.error) {
        setOpen(false);
        setToast(true);
      } else {
        setAviso(result.error);
      }
    });
  };

  const actualizarFechas = (nuevoInicio: string, finPropuesto: string) => {
    // La fecha de fin nunca puede ser anterior a la de inicio: se corrige
    // automáticamente en vez de dejar guardar un rango inválido.
    const nuevoFin =
      nuevoInicio && finPropuesto && finPropuesto < nuevoInicio
        ? nuevoInicio
        : finPropuesto;
    setInicio(nuevoInicio);
    setFin(nuevoFin);
    setCampoError(undefined);
    if (!diasEditado) {
      const calculados = diasHabilesEntre(nuevoInicio, nuevoFin);
      setDias(calculados !== null ? String(calculados) : "");
    }
  };

  const recalcular = () => {
    setDiasEditado(false);
    const calculados = diasHabilesEntre(inicio, fin);
    setDias(calculados !== null ? String(calculados) : "");
  };

  const borde = (campo: string) =>
    campoError === campo ? "border-dc-pink ring-1 ring-dc-pink" : "";

  return (
    <>
      <button type="button" onClick={abrir} className={BTN_PRIMARY}>
        + Nueva solicitud
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="titulo-registrar-vacaciones">
        <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <h2 id="titulo-registrar-vacaciones" className="font-display text-sm uppercase text-white">
            Registrar vacaciones
          </h2>

          <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div data-campo="fechaInicio">
                <span className={LABEL}>Fecha inicio</span>
                <DatePicker
                  name="fechaInicio"
                  value={inicio}
                  onChange={(v) => actualizarFechas(v, fin)}
                  rangeStart={inicio}
                  rangeEnd={fin}
                  invalido={campoError === "fechaInicio"}
                  className="w-full"
                  ariaLabel="Fecha inicio"
                />
              </div>
              <div data-campo="fechaFin">
                <span className={LABEL}>Fecha fin</span>
                <DatePicker
                  name="fechaFin"
                  value={fin}
                  onChange={(v) => actualizarFechas(inicio, v)}
                  rangeStart={inicio}
                  rangeEnd={fin}
                  min={inicio || undefined}
                  invalido={campoError === "fechaFin"}
                  className="w-full"
                  ariaLabel="Fecha fin"
                />
              </div>
            </div>

            <div data-campo="dias">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="dias-ooo" className="text-xs text-dc-muted">
                  Días OOO
                </label>
                {diasEditado && (
                  <button
                    type="button"
                    onClick={recalcular}
                    className="inline-flex items-center gap-1 text-[11px] text-dc-peri transition hover:text-dc-pink"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-3-6.7" />
                      <path d="M21 3v6h-6" />
                    </svg>
                    Recalcular automáticamente
                  </button>
                )}
              </div>
              <input
                id="dias-ooo"
                name="dias"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Días OOO"
                value={dias}
                onChange={(e) => {
                  setDias(e.target.value);
                  setDiasEditado(true);
                  setCampoError(undefined);
                }}
                className={`${INPUT} ${borde("dias")}`}
              />
              <span className="mt-1 block text-[11px] text-dc-muted">
                Se calcula solo a partir del rango, excluyendo sábados y
                domingos; podés corregirlo (por ejemplo, para descontar
                feriados).
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ToastAviso mensaje={aviso} onClose={() => setAviso(null)} />
      <ToastOk show={toast} onHide={() => setToast(false)}>
        Vacaciones registradas
      </ToastOk>
    </>
  );
}
