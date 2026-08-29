"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Los tooltips de toda la app, con una sola capa montada en el layout.
//
// Es una capa global y no un componente que envuelva a cada disparador por un
// motivo práctico: hay medio centenar de tooltips repartidos en treinta
// archivos —íconos, acciones de tabla, navegación, celdas truncadas— y
// envolverlos uno por uno significaría tocar todos y, sobre todo, acordarse de
// hacerlo la próxima vez. Acá alcanza con poner `data-tooltip` en cualquier
// elemento y queda con la estética de CORE.
//
// El `title` nativo se dejó de usar: no se puede darle estilo, aparece con el
// retardo que decide el sistema operativo y en algunos casos tapaba lo que
// estaba explicando.

// Cuánto espera antes de aparecer con el mouse. Suficiente para no dispararse
// al pasar de largo, corto para que no haya que esperarlo cuando se buscaba.
const RETARDO_MS = 350;

// Separación entre el disparador y el globo.
const SEPARACION = 8;

// Margen que se respeta contra el borde de la ventana al reubicarlo.
const MARGEN = 8;

type Posicion = { x: number; y: number; arriba: boolean };

export function Tooltips() {
  const [texto, setTexto] = useState<string | null>(null);
  const [pos, setPos] = useState<Posicion | null>(null);
  const globoRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cancelar = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const ocultar = () => {
      cancelar();
      // El aria-describedby se pone y se saca sobre el elemento real: es lo
      // que hace que un lector de pantalla anuncie el tooltip de un botón que
      // solo tiene ícono.
      disparadorRef.current?.removeAttribute("aria-describedby");
      disparadorRef.current = null;
      setTexto(null);
      setPos(null);
    };

    const mostrar = (el: HTMLElement, inmediato: boolean) => {
      const contenido = el.getAttribute("data-tooltip");
      if (!contenido) return;
      cancelar();
      const abrir = () => {
        disparadorRef.current = el;
        el.setAttribute("aria-describedby", "dc-tooltip");
        setTexto(contenido);
        // La posición definitiva se calcula en el efecto de abajo, ya con el
        // globo medido. Acá solo se ancla al disparador.
        const r = el.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top, arriba: true });
      };
      // Con el teclado no hay retardo: llegar con Tab a un control ya es
      // haberlo elegido, y esperar ahí no protege de nada.
      if (inmediato) abrir();
      else timerRef.current = setTimeout(abrir, RETARDO_MS);
    };

    const alEntrar = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-tooltip]");
      if (!(el instanceof HTMLElement)) {
        if (disparadorRef.current) ocultar();
        return;
      }
      if (el === disparadorRef.current) return;
      mostrar(el, e.type === "focusin");
    };

    document.addEventListener("pointerover", alEntrar);
    document.addEventListener("focusin", alEntrar);
    document.addEventListener("pointerdown", ocultar);
    // Al scrollear o redimensionar, el globo quedaría flotando lejos de su
    // disparador: es más honesto cerrarlo que reposicionarlo en cada cuadro.
    window.addEventListener("scroll", ocultar, true);
    window.addEventListener("resize", ocultar);
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") ocultar();
    };
    document.addEventListener("keydown", alTeclado);

    return () => {
      cancelar();
      document.removeEventListener("pointerover", alEntrar);
      document.removeEventListener("focusin", alEntrar);
      document.removeEventListener("pointerdown", ocultar);
      window.removeEventListener("scroll", ocultar, true);
      window.removeEventListener("resize", ocultar);
      document.removeEventListener("keydown", alTeclado);
    };
  }, []);

  // Reubicación: ya con el globo en el DOM se lo puede medir y correr para que
  // no se corte contra ningún borde.
  useEffect(() => {
    const globo = globoRef.current;
    const el = disparadorRef.current;
    if (!globo || !el || !texto) return;

    const r = el.getBoundingClientRect();
    const g = globo.getBoundingClientRect();

    // Arriba por defecto; abajo si arriba no entra.
    const arriba = r.top - g.height - SEPARACION >= MARGEN;
    const y = arriba ? r.top - SEPARACION : r.bottom + SEPARACION;

    // Centrado en el disparador, recortado contra los bordes laterales.
    const mitad = g.width / 2;
    const x = Math.min(
      Math.max(r.left + r.width / 2, MARGEN + mitad),
      window.innerWidth - MARGEN - mitad,
    );

    setPos((p) =>
      p && p.x === x && p.y === y && p.arriba === arriba ? p : { x, y, arriba },
    );
  }, [texto]);

  if (typeof document === "undefined" || !texto || !pos) return null;

  return createPortal(
    <div
      id="dc-tooltip"
      ref={globoRef}
      role="tooltip"
      // Anclado en 0,0 y movido con transform, en vez de posicionado con
      // left/top. Con `left` cerca del borde derecho, un elemento fixed
      // "encoge para entrar" en el espacio que le queda a la derecha: el globo
      // se volvía una columna angosta de tres palabras por línea. Desde 0 tiene
      // toda la ventana para medirse, y recién después se lo corre.
      className="dc-fade-in pointer-events-none fixed left-0 top-0 z-[90] w-max max-w-xs rounded-lg border border-dc-peri/25 bg-dc-deep px-2.5 py-1.5 text-xs leading-snug text-dc-text shadow-[0_6px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(139,140,255,0.12)]"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, ${
          pos.arriba ? "-100%" : "0"
        })`,
      }}
    >
      {texto}
    </div>,
    document.body,
  );
}
