"use client";

import { useTransition } from "react";
import { actualizarCampoTarea } from "./actions";

// Cuántos mentores participan de la tarea. Solo hay dos valores posibles, así
// que no vale un desplegable: el botón alterna 1 ↔ 2 de un clic y muestra el
// valor con uno o dos monigotes, para leerlo sin abrir nada.
export function SelectorPersonas({
  tareaId,
  personas,
}: {
  tareaId: string;
  personas: number;
}) {
  const [pending, start] = useTransition();
  const dos = personas === 2;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await actualizarCampoTarea(tareaId, "personas", dos ? "1" : "2");
        })
      }
      data-tooltip={`Personas involucradas: ${personas}`}
      aria-label={`Personas involucradas: ${personas}. Cambiar a ${dos ? 1 : 2}.`}
      className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums transition hover:bg-dc-peri/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 disabled:opacity-50 ${
        dos ? "text-dc-peri" : "text-dc-muted"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        {/* La segunda silueta aparece solo con 2: la cantidad se ve sin leer. */}
        {dos && <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />}
      </svg>
      {personas}
    </button>
  );
}
