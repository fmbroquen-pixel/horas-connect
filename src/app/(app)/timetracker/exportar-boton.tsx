"use client";

import { useEffect, useRef, useState } from "react";

export function ExportarBoton({
  desde,
  hasta,
  proyecto,
}: {
  desde: string;
  hasta: string;
  proyecto: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const params = new URLSearchParams({ desde, hasta });
  if (proyecto) params.set("proyecto", proyecto);
  const url = (formato: string) =>
    `/timetracker/export?${params.toString()}&formato=${formato}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Exportar (Excel o CSV)"
        aria-label="Exportar registros"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-dc-line px-2.5 py-1.5 text-sm text-dc-muted transition hover:border-dc-peri hover:text-dc-text focus:border-dc-peri focus:text-dc-text focus:outline-none"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="dc-menu dc-pop-in absolute right-0 top-full z-40 mt-2 w-40 rounded-xl border border-dc-line bg-dc-deep p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <a
            role="menuitem"
            href={url("xlsx")}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text"
          >
            Excel (.xlsx)
          </a>
          <a
            role="menuitem"
            href={url("csv")}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text"
          >
            CSV (.csv)
          </a>
        </div>
      )}
    </div>
  );
}
