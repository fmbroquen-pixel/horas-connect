"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Modal accesible y consistente para toda la app. Se renderiza con un portal
// a <body> para escapar de cualquier ancestro con transform (p. ej. la
// animación dc-page-in de las secciones), de modo que el overlay cubra todo
// el viewport y no quede recortado dentro del contenedor de Settings.
//
// Capas: el oscurecimiento va en z-40 (por debajo del header, que está en
// z-50 y es opaco, así la navegación superior no se oscurece); la capa que
// centra la card va en z-60 (por encima del header). Fade suave de opacidad
// al abrir y cerrar, bloqueo del scroll de fondo, y cierre con Esc o clic
// fuera de la card.
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
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      // Montar y, en frames siguientes, animar la opacidad de 0 a 1.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        setMounted(true);
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    // Cerrar: fade de salida y desmontar al terminar la transición.
    const raf = requestAnimationFrame(() => setShown(false));
    const t = setTimeout(() => setMounted(false), 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px] transition-opacity duration-200 ease-out ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="presentation"
        onClick={onClose}
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
          shown ? "opacity-100" : "opacity-0"
        }`}
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
