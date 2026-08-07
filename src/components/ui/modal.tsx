"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Milisegundos del fade de salida: debe coincidir con la duración de la
// transición de abajo, o la card desaparecería de golpe a mitad de camino.
const SALIDA_MS = 200;

// Modal accesible y consistente para toda la app. Se renderiza con un portal
// a <body> para escapar de cualquier ancestro con transform (p. ej. la
// animación dc-page-in de las secciones), de modo que el overlay cubra todo
// el viewport y no quede recortado dentro del contenedor de Settings.
//
// Capas: el oscurecimiento va en z-40 (por debajo del header, que está en
// z-50 y es opaco, así la navegación superior no se oscurece); la capa que
// centra la card va en z-60 (por encima del header). Bloqueo del scroll de
// fondo, y cierre con Esc o clic fuera de la card.
//
// La ENTRADA es una animación CSS (dc-fade-in) y la SALIDA una transición.
// Antes las dos eran transiciones encadenadas con requestAnimationFrame, para
// que el navegador pintara el estado inicial antes del final. El problema es
// que en una pestaña en segundo plano no se emiten frames: el rAF no
// disparaba, `mounted` no llegaba a ponerse en true y el modal simplemente no
// aparecía. Una animación arranca sola cuando el elemento entra al DOM, así
// que el modal se monta de una y no depende de que la pestaña esté visible.
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  ariaLabel?: string;
}) {
  // Montado sigue a `open` al instante al abrir, y se retrasa al cerrar para
  // dejar correr el fade de salida. Se sincroniza en el render, no en un
  // efecto: esperar al efecto sería volver a depender de un frame.
  const [montado, setMontado] = useState(open);
  if (open && !montado) setMontado(true);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMontado(false), SALIDA_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!montado) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [montado, onClose]);

  if (!montado) return null;

  // dc-fade-in pinta la entrada; la transición de opacidad solo se usa al
  // cerrar, cuando `open` pasa a false y la clase cambia a opacity-0.
  const capa = `dc-fade-in transition-opacity duration-200 ease-out ${
    open ? "opacity-100" : "opacity-0"
  }`;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px] ${capa}`}
      />
      <div
        role="presentation"
        onClick={onClose}
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${capa}`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
