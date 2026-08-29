"use client";

import { BTN_AGREGAR } from "@/lib/ui";

// El alta de una entidad, igual en todas las pantallas.
//
// Violeta sólido + "+" = crear. El ícono hace la regla reconocible de un
// vistazo y el texto dice qué se crea.
//
// Estuvo un rato como cuadrado de solo ícono y no funcionó: en el header de una
// pantalla, un cuadradito de 32px al borde derecho se leía como un control
// secundario flotando solo, no como LA acción principal. El texto no era ruido,
// era el peso que lo anclaba.
export function BotonAgregar({
  etiqueta,
  onClick,
}: {
  // "Agregar usuario", "Agregar cliente"… Se muestra y además va de tooltip.
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      className={BTN_AGREGAR}
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
      {etiqueta}
    </button>
  );
}
