"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Toast de aviso (validación) — NO es un modal, no bloquea la interacción.
// Aparece arriba y al centro, sobre el formulario de captura, y se cierra con
// Esc, Enter o automáticamente a los ~4s. Portal a <body> para no quedar
// recortado por ancestros con transform.
export function ToastAviso({
  mensaje,
  onClose,
}: {
  mensaje: string | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (mensaje) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        setMounted(true);
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      const t = setTimeout(onClose, 4000);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.key === "Enter") onClose();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(t);
        document.removeEventListener("keydown", onKey);
      };
    }
    const raf = requestAnimationFrame(() => setShown(false));
    const t = setTimeout(() => setMounted(false), 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [mensaje, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 rounded-xl border border-dc-pink/40 bg-dc-deep px-4 py-3 text-sm text-dc-text shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out ${
          shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-dc-pink" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        {mensaje}
      </div>
    </div>,
    document.body,
  );
}
