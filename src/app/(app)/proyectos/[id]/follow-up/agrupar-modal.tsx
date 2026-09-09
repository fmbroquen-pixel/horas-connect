"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { DatePicker } from "@/components/date-picker";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";
import { mismaSemanaISO, siguienteHabilISO, viernesDeISO } from "@/lib/semana-iso";

// El diálogo de agrupar.
//
// Agrupar no es solo marcar tareas: es decidir que van juntas y CUÁNDO. Por eso
// pide el rango antes de confirmar en vez de agrupar primero y dejar las fechas
// para después: sin fechas, "agrupadas" no significaba nada visible y el usuario
// tenía que descubrir en un segundo paso que además debía juntarlas a mano.
//
// El rango tiene que entrar en una sola semana. Es la regla base del plan -una
// tarea, una semana- y un grupo la comparte en vez de aflojarla. Se valida acá
// para poder deshabilitar el botón y explicar por qué, y otra vez en el
// servidor, que es donde la regla manda.
export function AgruparModal({
  tareas,
  onCancelar,
  onConfirmar,
  pendiente,
}: {
  // Las seleccionadas, en el orden del plan.
  tareas: { id: string; nombre: string; fechaInicio: string }[];
  onCancelar: () => void;
  onConfirmar: (inicio: string, fin: string) => void;
  pendiente: boolean;
}) {
  // Arranca en la semana de la primera seleccionada, de lunes a viernes: es la
  // propuesta que casi siempre se acepta tal cual.
  const primera = tareas[0]?.fechaInicio ?? "";
  const [inicio, setInicio] = useState(() => siguienteHabilISO(primera));
  const [fin, setFin] = useState(() => viernesDeISO(primera));

  const invertido = Boolean(inicio && fin && fin < inicio);
  const cruzaSemanas = Boolean(inicio && fin && !invertido && !mismaSemanaISO(inicio, fin));
  const problema = invertido
    ? "El fin no puede ser anterior al inicio."
    : cruzaSemanas
      ? "Un grupo entra en una sola semana: elegí un inicio y un fin de la misma."
      : null;

  return (
    <Modal open onClose={onCancelar} ariaLabel="Agrupar tareas">
      <h2 className="font-display text-sm uppercase text-white">Agrupar tareas</h2>
      <p className="mt-3 text-sm text-dc-text">
        Las tareas agrupadas se mueven juntas.
      </p>
      <p className="mt-1 text-xs text-dc-muted">
        Comparten inicio y fin, y cualquier reprogramación las desplaza como una
        sola.
      </p>

      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-dc-line bg-dc-deeper/40 p-2">
        {tareas.map((t) => (
          <li key={t.id} className="truncate text-sm text-dc-text" data-tooltip={t.nombre}>
            {t.nombre}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-dc-muted">Inicio</span>
          <DatePicker
            value={inicio}
            onChange={setInicio}
            ariaLabel="Inicio del grupo"
            rangeStart={inicio}
            rangeEnd={fin}
            invalido={Boolean(problema)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-dc-muted">Fin</span>
          <DatePicker
            value={fin}
            onChange={setFin}
            ariaLabel="Fin del grupo"
            min={inicio || undefined}
            rangeStart={inicio}
            rangeEnd={fin}
            invalido={Boolean(problema)}
          />
        </label>
      </div>

      {problema && (
        <p role="alert" className="mt-2 text-xs text-dc-pink">
          {problema}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={BTN_SECONDARY}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onConfirmar(inicio, fin)}
          disabled={Boolean(problema) || !inicio || !fin || pendiente}
          className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {pendiente ? "Agrupando…" : "Agrupar"}
        </button>
      </div>
    </Modal>
  );
}
