"use client";

// Un botón que rota entre pocas opciones y muestra la que está puesta.
//
// Sirve cuando las alternativas son dos o tres, no hace falta verlas todas a
// la vez y lo que importa es el estado actual. A diferencia de un interruptor,
// acá el botón DICE en qué estado está -"2 semanas", no un "2" suelto- así que
// no queda la duda de si el rótulo describe lo que hay o lo que va a pasar.
//
// Solo dibuja: qué opción sigue lo decide `useCiclo`. Esa separación es lo que
// permite que el mismo botón sirva para cualquier ciclo y que el ciclo se pueda
// mostrar de otra forma sin tocarlo.
export function BotonCiclico({
  contenido,
  onSiguiente,
  proximo,
  deshabilitado = false,
  tooltipDeshabilitado,
  ariaLabel,
}: {
  // Lo que se ve: el estado actual. Puede llevar un ícono además del texto.
  contenido: React.ReactNode;
  onSiguiente: () => void;
  // Cómo se llama la opción que viene, para el tooltip. El tooltip dice qué va
  // a PASAR y no en qué estado está: el estado ya se lee en el propio botón.
  proximo: string;
  deshabilitado?: boolean;
  tooltipDeshabilitado?: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onSiguiente}
      disabled={deshabilitado}
      data-tooltip={deshabilitado ? tooltipDeshabilitado : `Mostrar ${proximo}`}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dc-line bg-dc-deeper px-2.5 py-1 text-xs text-dc-text transition hover:border-dc-peri hover:bg-dc-peri/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 disabled:cursor-not-allowed disabled:text-dc-muted disabled:hover:border-dc-line disabled:hover:bg-dc-deeper"
    >
      {contenido}
    </button>
  );
}
