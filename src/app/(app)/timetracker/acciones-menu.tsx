"use client";

import { useEffect, useRef, useState } from "react";
import { ImportarModal } from "./importar-modal";
import { PapeleraModal } from "../papelera/papelera";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text focus:bg-dc-line/50 focus:text-dc-text focus:outline-none";

export function AccionesMenu({
  desde,
  hasta,
  proyecto,
}: {
  desde: string;
  hasta: string;
  proyecto: string;
}) {
  const [open, setOpen] = useState(false);
  const [vista, setVista] = useState<"main" | "export">("main");
  const [importOpen, setImportOpen] = useState(false);
  const [papeleraOpen, setPapeleraOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const cerrar = () => {
    setOpen(false);
    setVista("main");
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
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
          className="dc-menu dc-pop-in absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-dc-line bg-dc-deep p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {vista === "main" ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setImportOpen(true);
                  cerrar();
                }}
                className={ITEM}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 9l5-5 5 5" />
                  <path d="M12 4v12" />
                </svg>
                Importar
              </button>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                onClick={() => setVista("export")}
                className={`${ITEM} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  Exportar
                </span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <div className="my-1 h-px bg-dc-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPapeleraOpen(true);
                  cerrar();
                }}
                className={ITEM}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                Papelera
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setVista("main")}
                className={`${ITEM} text-xs text-dc-muted`}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Volver
              </button>
              <a role="menuitem" href={url("xlsx")} onClick={cerrar} className={ITEM}>
                Excel (.xlsx)
              </a>
              <a role="menuitem" href={url("csv")} onClick={cerrar} className={ITEM}>
                CSV (.csv)
              </a>
            </>
          )}
        </div>
      )}

      {importOpen && <ImportarModal onCerrar={() => setImportOpen(false)} />}
      <PapeleraModal tipo="hora" open={papeleraOpen} onClose={() => setPapeleraOpen(false)} />
    </div>
  );
}
