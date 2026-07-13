"use client";

import { useEffect, useRef, useState } from "react";

// Ícono de información con tooltip. En desktop se abre con hover y focus; en
// mobile con tap, y se cierra al tocar afuera. El contenido admite varias
// líneas y se mantiene con la estética oscura de la app.
export function InfoButton({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Más información"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-dc-line text-dc-muted transition hover:border-dc-peri hover:text-dc-text focus:border-dc-peri focus:text-dc-text focus:outline-none"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.5h.01" />
        </svg>
      </button>

      {open && (
        <span
          role="tooltip"
          className="dc-menu dc-pop-in absolute left-0 top-full z-40 mt-2 block w-[320px] max-w-[85vw] rounded-xl border border-dc-line bg-dc-deep px-3.5 py-2.5 text-xs leading-relaxed font-normal normal-case tracking-normal text-dc-muted shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
