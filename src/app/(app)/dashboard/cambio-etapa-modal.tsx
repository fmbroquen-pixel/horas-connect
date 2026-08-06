"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { COLOR_ESTADO, ETIQUETA_ESTADO } from "../proyectos/[id]/follow-up/constantes";
import type { CierreEtapa } from "../proyectos/actions";

// Los tres cierres posibles de la etapa que se deja atrás. "En curso" no está:
// dos etapas actuales a la vez no describen un plan secuencial.
const CIERRES: CierreEtapa[] = ["sin_iniciar", "no_ejecutada", "finalizada"];

// Mover la etapa actual no es un cambio de un solo dato: cierra una tarea del
// Roadmap y abre otra. Qué pasa con la que se cierra —se terminó, no se hizo,
// o arrancó por error y vuelve atrás— no se puede adivinar desde el Home, así
// que se pregunta antes de escribir nada.
export function CambioEtapaModal({
  abierto,
  proyecto,
  etapaActual,
  etapaNueva,
  guardando,
  error,
  onCancelar,
  onConfirmar,
}: {
  abierto: boolean;
  proyecto: string;
  etapaActual: string;
  etapaNueva: string;
  guardando: boolean;
  error?: string;
  onCancelar: () => void;
  onConfirmar: (cierre: CierreEtapa) => void;
}) {
  // Avanzar es lo habitual, así que el cierre por defecto es Finalizado.
  const [cierre, setCierre] = useState<CierreEtapa>("finalizada");

  // Cada apertura arranca de cero: el modal queda montado entre una y otra,
  // y heredar la elección anterior es justo el tipo de default silencioso que
  // hace confirmar sin leer. Se sincroniza en el render, no en un efecto.
  const [estabaAbierto, setEstabaAbierto] = useState(abierto);
  if (abierto !== estabaAbierto) {
    setEstabaAbierto(abierto);
    if (abierto) setCierre("finalizada");
  }

  return (
    <Modal open={abierto} onClose={onCancelar} labelledBy="titulo-cambio-etapa">
      <div className="dc-menu dc-pop-in w-full max-w-md rounded-2xl border border-dc-line bg-dc-deep p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <h2 id="titulo-cambio-etapa" className="font-display text-sm uppercase text-white">
          Cambiar etapa actual
        </h2>
        <p className="mt-1 text-xs text-dc-muted">{proyecto}</p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm text-dc-text">
            <span className="text-dc-muted">Al cerrarla,</span> {etapaActual}{" "}
            <span className="text-dc-muted">queda como</span>
          </legend>
          <div className="space-y-1.5">
            {CIERRES.map((c) => (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                  cierre === c
                    ? "border-dc-peri bg-dc-peri/15 text-dc-text"
                    : "border-dc-line text-dc-muted hover:border-dc-peri/50 hover:text-dc-text"
                }`}
              >
                <input
                  type="radio"
                  name="cierre-etapa"
                  value={c}
                  checked={cierre === c}
                  onChange={() => setCierre(c)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLOR_ESTADO[c], boxShadow: `0 0 6px ${COLOR_ESTADO[c]}` }}
                />
                {ETIQUETA_ESTADO[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 flex items-center gap-2 text-sm text-dc-text">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: COLOR_ESTADO.en_curso,
              boxShadow: `0 0 6px ${COLOR_ESTADO.en_curso}`,
            }}
          />
          <span>
            {etapaNueva} <span className="text-dc-muted">pasa a En curso</span>
          </span>
        </p>

        {error && (
          <p className="mt-3 text-xs text-dc-pink" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancelar} disabled={guardando} className={BTN_SECONDARY}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(cierre)}
            disabled={guardando}
            className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {guardando ? "Guardando…" : "Confirmar cambio"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
