"use client";

import { useEffect, useRef, useState } from "react";

export type OpcionTag = { value: string; label: string; dot?: string };

// Tag clickeable que abre un popover chico con las opciones disponibles.
// A diferencia de Dropdown (components/dropdown.tsx), el trigger no se ve
// como un input con borde: es una pastilla, pensada para vivir dentro de una
// lista ejecutiva sin parecer un formulario. Guarda al elegir y cierra solo.
export function TagPopover({
  valor,
  opciones,
  placeholder,
  onElegir,
  ariaLabel,
}: {
  valor: string;
  opciones: OpcionTag[];
  placeholder: string;
  onElegir: (v: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
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

  const seleccionada = opciones.find((o) => o.value === valor);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`inline-flex w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-left text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri ${
          seleccionada
            ? "bg-dc-peri/15 text-dc-peri hover:bg-dc-peri/25"
            : "bg-dc-line text-dc-muted hover:bg-dc-line/70"
        }`}
      >
        {seleccionada?.dot && (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: seleccionada.dot }}
          />
        )}
        <span className="truncate">{seleccionada?.label ?? placeholder}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="dc-menu dc-pop-in absolute left-0 top-full z-40 mt-1.5 min-w-[9rem] overflow-hidden rounded-xl border border-dc-line bg-dc-deep p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {opciones.map((o) => {
            const activa = o.value === valor;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onElegir(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition ${
                    activa
                      ? "bg-dc-peri/20 text-white"
                      : "text-dc-muted hover:bg-dc-line/50 hover:text-dc-text"
                  }`}
                >
                  {o.dot && (
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: o.dot }}
                    />
                  )}
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
