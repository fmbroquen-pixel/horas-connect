"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Confirmación breve (toast) reutilizable. Se renderiza con portal a <body>
// para no quedar confinado por ancestros con transform, aparece abajo a la
// derecha del viewport, hace fade y se oculta solo a los ~3s.
export function ToastOk({
  show,
  onHide,
  children,
}: {
  show: boolean;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (show) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        setMounted(true);
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      const t = setTimeout(onHide, 3000);
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(t);
      };
    }
    const raf = requestAnimationFrame(() => setShown(false));
    const t = setTimeout(() => setMounted(false), 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [show, onHide]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`dc-menu fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-xl border border-dc-line bg-dc-deep px-4 py-3 text-sm text-dc-text shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dc-peri" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {children}
    </div>,
    document.body,
  );
}
