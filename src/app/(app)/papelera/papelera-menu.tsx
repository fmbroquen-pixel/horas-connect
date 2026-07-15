"use client";

import { useEffect, useRef, useState } from "react";
import { PapeleraModal } from "./papelera";
import type { TipoEliminado } from "./actions";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text focus:bg-dc-line/50 focus:text-dc-text focus:outline-none";

// Menú de acciones del historial (⋮) para módulos cuya única acción extra es
// la Papelera (Viáticos, Vacaciones). Se ubica junto al botón de Filtro.
export function PapeleraMenu({ tipo }: { tipo: TipoEliminado }) {
  const [open, setOpen] = useState(false);
  const [papeleraOpen, setPapeleraOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Más acciones"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center rounded-lg border border-dc-line px-2 py-1.5 text-dc-muted transition hover:border-dc-peri hover:text-dc-text focus:border-dc-peri focus:text-dc-text focus:outline-none"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="dc-menu dc-pop-in absolute right-0 top-full z-40 mt-2 w-44 rounded-xl border border-dc-line bg-dc-deep p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPapeleraOpen(true);
              setOpen(false);
            }}
            className={ITEM}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            Papelera
          </button>
        </div>
      )}

      <PapeleraModal tipo={tipo} open={papeleraOpen} onClose={() => setPapeleraOpen(false)} />
    </div>
  );
}
