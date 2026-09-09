"use client";

// Cuántos mentores participan de la tarea. Solo hay dos valores posibles, así
// que no vale un desplegable: el botón alterna 1 ↔ 2 de un clic y muestra el
// valor con uno o dos monigotes, para leerlo sin abrir nada.
//
// No guarda ni sabe guardar. El clic sube a la fila, que es quien tiene las
// horas al lado y puede mover las dos cosas juntas antes de que el servidor
// conteste. Acá adentro solo se podía cambiar el número propio, y las horas
// llegaban tarde con toda la página detrás.
//
// Tampoco se deshabilita mientras se guarda: el valor que muestra ya es el
// definitivo. Apagarlo esperando al servidor era justamente la demora que se
// sentía.
export function SelectorPersonas({
  personas,
  onAlternar,
  soloLectura = false,
}: {
  personas: number;
  onAlternar: () => void;
  // Proyecto inactivo. El dato se sigue viendo -cuántas personas lleva la
  // tarea es parte de su historia-; lo que se apaga es el clic que lo alterna.
  soloLectura?: boolean;
}) {
  const dos = personas === 2;
  const proximo = dos ? 1 : 2;
  const etiqueta = `${personas} ${personas === 1 ? "persona" : "personas"}`;

  return (
    <button
      type="button"
      disabled={soloLectura}
      onClick={onAlternar}
      data-tooltip={etiqueta}
      aria-label={
        soloLectura
          ? etiqueta
          : `${etiqueta}. Cambiar a ${proximo} y ajustar las horas estimadas.`
      }
      className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 ${
        soloLectura ? "cursor-default" : "hover:bg-dc-peri/10"
      } ${dos ? "text-dc-peri" : "text-dc-muted"}`}
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
