"use client";

import { BTN_ICON_PRIMARY } from "@/lib/ui";

// El alta de una entidad, igual en todas las pantallas.
//
// Violeta sólido + "+" = crear. Es una sola regla, así que el botón se
// reconoce antes de leer el tooltip; lo que cambia entre pantallas es solo qué
// se crea, y eso lo dice el title.
export function BotonAgregar({
  etiqueta,
  onClick,
}: {
  // "Agregar usuario", "Agregar cliente"…
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className={BTN_ICON_PRIMARY}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
