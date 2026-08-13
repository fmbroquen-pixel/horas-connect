"use client";

import { useLayoutEffect, type RefObject } from "react";

// Posiciona un popover que se dibuja en un portal sobre el <body>, anclado a
// su trigger.
//
// El motivo: dentro de un contenedor con scroll (las tablas, las cards del
// Home) un popover posicionado en el flujo queda recortado por el `overflow`,
// o lo estira y genera scroll horizontal en la pantalla entera. Sacándolo a
// un portal con `position: fixed` se dibuja sobre todo y el scroll sigue
// siendo el del componente.
//
// La posición se escribe directamente en el estilo del nodo en vez de pasar
// por estado: medir el DOM y devolverle el resultado ES sincronizar con un
// sistema externo, que es para lo que sirven los efectos. Además evita un
// segundo render y, al hacerse en un layout effect, no hay parpadeo.

export type OpcionesPopover = {
  // Que el popover no sea más angosto que su trigger (lo usa el desplegable,
  // para que el menú acompañe el ancho del campo).
  igualarAnchoDelAncla?: boolean;
  // Centrado sobre el trigger en vez de alineado a su borde. Lo usan los tags
  // del Home, que viven centrados en su columna: alinearlos a un borde los
  // haría ver descolgados de la pastilla que los abre.
  centrar?: boolean;
};

export function usePopoverFlotante(
  abierto: boolean,
  anclaRef: RefObject<HTMLElement | null>,
  popRef: RefObject<HTMLElement | null>,
  opciones: OpcionesPopover = {},
) {
  const { igualarAnchoDelAncla = false, centrar = false } = opciones;

  useLayoutEffect(() => {
    if (!abierto) return;

    const MARGEN = 8; // aire mínimo contra el borde de la ventana
    const SEPARACION = 6; // aire entre el trigger y el popover

    const ubicar = () => {
      const ancla = anclaRef.current?.getBoundingClientRect();
      const pop = popRef.current;
      if (!ancla || !pop) return;

      // Antes de medir el alto: el ancho mínimo puede cambiarlo.
      if (igualarAnchoDelAncla) pop.style.minWidth = `${ancla.width}px`;

      const alto = pop.offsetHeight;
      const ancho = pop.offsetWidth;

      // Se abre hacia abajo salvo que no entre; ahí va hacia arriba.
      const cabeAbajo =
        ancla.bottom + SEPARACION + alto + MARGEN <= window.innerHeight;
      const top = cabeAbajo
        ? ancla.bottom + SEPARACION
        : Math.max(MARGEN, ancla.top - alto - SEPARACION);

      // Centrado sobre el trigger, o creciendo hacia la derecha desde su
      // borde izquierdo. Si de ese lado no entra, se abre hacia la izquierda:
      // el borde derecho del popover se alinea con el del trigger. El clamp
      // posterior es la última red —lo deja dentro de la ventana aunque
      // ninguno de los dos lados alcance—, para que nunca genere scroll
      // horizontal.
      const cabeDerecha = ancla.left + ancho + MARGEN <= window.innerWidth;
      const deseado = centrar
        ? ancla.left + ancla.width / 2 - ancho / 2
        : cabeDerecha
          ? ancla.left
          : ancla.right - ancho;
      const left = Math.min(
        Math.max(MARGEN, deseado),
        Math.max(MARGEN, window.innerWidth - ancho - MARGEN),
      );

      pop.style.top = `${top}px`;
      pop.style.left = `${left}px`;
    };

    ubicar();
    window.addEventListener("resize", ubicar);
    // capture: el scroll de un contenedor interno (la tabla) no burbujea, así
    // que hay que escucharlo en fase de captura para seguir al trigger.
    window.addEventListener("scroll", ubicar, true);
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierto, anclaRef, popRef, igualarAnchoDelAncla, centrar]);
}

// Clases comunes del popover flotante: el posicionamiento lo pone el hook.
//
// z-70 y no z-50: un popover siempre lo abre algo que está por debajo, así
// que tiene que quedar por encima de TODO lo que puede contener su trigger.
// El modal centra su card en z-60 (ver ui/modal.tsx), y con el popover en 50
// el menú de un desplegable dentro de un formulario modal se dibujaba detrás
// de la card: el trigger respondía, el menú se abría y no se veía ni se podía
// clickear. En el flujo esto no pasaba porque el menú era hijo del trigger;
// apareció al sacarlos a un portal.
export const POPOVER_FLOTANTE =
  "dc-menu dc-pop-in fixed z-[70] rounded-xl border border-dc-line bg-dc-deep shadow-[0_12px_32px_rgba(0,0,0,0.45)]";

// Marca que llevan todos los popovers flotantes. Va como atributo y no como
// clase porque no pinta nada: existe solo para poder reconocerlos desde afuera.
export const ATRIBUTO_POPOVER = "data-dc-popover";

// ¿El clic cayó dentro de un popover flotante?
//
// Hace falta porque estos popovers viven en un portal a <body>: para cualquier
// panel que se cierre "al hacer clic afuera", un clic en el calendario de un
// DatePicker o en el menú de un Dropdown ES afuera, aunque visualmente esté
// adentro. Sin esto, abrir el calendario dentro del panel de filtros y elegir
// un día cerraba el panel antes de que el día llegara a seleccionarse: parecía
// que el date picker no dejaba elegir fechas.
export function dentroDeUnPopover(nodo: EventTarget | null): boolean {
  return (
    nodo instanceof Element && nodo.closest(`[${ATRIBUTO_POPOVER}]`) !== null
  );
}
