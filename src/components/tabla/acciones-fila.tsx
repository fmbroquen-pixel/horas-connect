"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BTN_ICON_SM,
  BTN_ICON_OK_SM,
  BTN_ICON_DANGER_SM,
  BTN_ICON_CONFIRM_SM,
} from "@/lib/ui";

// Íconos únicos compartidos por todas las acciones de tabla de la app, para
// que Time Tracking, Time Off, Equipo, Gantt (y las de Settings, vía
// EditarLink) usen exactamente el mismo trazo y tamaño.
function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconoTacho() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconoX() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// Mientras el guardado viaja: el check se va y queda girando en su lugar, sin
// cambiar el tamaño del botón. Es animación CSS, así que no depende de que la
// pestaña esté produciendo cuadros.
function Spinner() {
  return (
    <span
      aria-hidden
      className="block h-[15px] w-[15px] animate-spin rounded-full border-2 border-dc-green/25 border-t-dc-green"
    />
  );
}

// Editar: abre el modo de edición inline de la fila (lápiz, estilo secundario).
export function BotonEditarIcono({
  onClick,
  label = "Editar",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={BTN_ICON_SM} title={label} aria-label={label}>
      <IconoLapiz />
    </button>
  );
}

// Eliminar en dos pasos: tacho → check de confirmación (rosa lleno). Solo
// íconos, con tooltip en cada estado.
export function BotonEliminarIcono({
  onConfirm,
  label = "Eliminar",
}: {
  // Puede devolver una promesa: se espera antes de soltar el botón para que
  // la fila no vuelva a su estado normal antes de que el borrado termine.
  onConfirm: () => void | Promise<unknown>;
  label?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  // La confirmación corre dentro de una transición: es lo que hace que React
  // aplique al árbol actual la revalidación que devuelve el server action.
  // Llamarlo suelto dejaba la pantalla —y los KPIs de otras vistas— con los
  // valores viejos hasta recargar.
  const [pending, start] = useTransition();

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={BTN_ICON_DANGER_SM}
        title={label}
        aria-label={label}
      >
        <IconoTacho />
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await onConfirm();
          setConfirmando(false);
        })
      }
      className={BTN_ICON_CONFIRM_SM}
      title="Confirmar eliminación"
      aria-label="Confirmar eliminación"
    >
      <IconoCheck />
    </button>
  );
}

// Acción principal de un formulario (submit): guardar lo editado o crear algo
// nuevo. Es la misma operación —confirmar el formulario— así que lleva el
// mismo ícono y solo cambia la etiqueta; lo que la distingue de Cancelar es el
// relleno, no el dibujo.
//
// `form` permite apuntar a un formulario por id, para los casos en que el
// botón no puede estar dentro de él (una fila de <table>, por ejemplo).
export function BotonGuardarIcono({
  pending,
  disabled,
  form,
  label = "Guardar",
  exito,
}: {
  pending?: boolean;
  // Aparte de `pending`: hay formularios que además se bloquean hasta que lo
  // cargado es válido.
  disabled?: boolean;
  form?: string;
  label?: string;
  // Contador que el formulario incrementa cuando el guardado salió bien. Es
  // un número y no un booleano porque dos guardados seguidos tienen que
  // pulsar dos veces: con un booleano el estado no cambiaría la segunda vez.
  // Los formularios que se cierran al guardar no necesitan pasarlo.
  exito?: number;
}) {
  // Se ajusta el estado durante el render, que es el patrón recomendado para
  // reaccionar a un cambio de prop sin el parpadeo de un efecto.
  const [ultimoExito, setUltimoExito] = useState(exito);
  const [celebrando, setCelebrando] = useState(false);
  if (exito !== ultimoExito) {
    setUltimoExito(exito);
    setCelebrando(true);
  }
  useEffect(() => {
    if (!celebrando) return;
    const t = setTimeout(() => setCelebrando(false), 600);
    return () => clearTimeout(t);
  }, [celebrando]);

  return (
    <button
      type="submit"
      form={form}
      disabled={pending || disabled}
      className={`${BTN_ICON_OK_SM} ${celebrando ? "dc-guardado" : ""}`}
      title={label}
      aria-label={label}
    >
      {pending ? <Spinner /> : <IconoCheck />}
    </button>
  );
}

// Cancelar la edición inline (✕).
export function BotonCancelarIcono({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={BTN_ICON_SM} title="Cancelar" aria-label="Cancelar">
      <IconoX />
    </button>
  );
}
