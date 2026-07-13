"use client";

import { useEffect, useRef, useState } from "react";

export type OpcionDropdown = { value: string; label: string };

// Dropdown propio (no <select> nativo): trigger estilo input de la app y menú
// flotante oscuro con animación fade+slide, estados hover/focus/selected y la
// opción activa resaltada con el acento de la app.
export function Dropdown({
  name,
  value,
  onChange,
  options,
  placeholder = "Elegí…",
  disabled,
  className = "",
  invalido = false,
  ariaLabel,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: OpcionDropdown[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  invalido?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [foco, setFoco] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const seleccionada = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const abrir = () => {
    const idx = options.findIndex((o) => o.value === value);
    setFoco(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const elegir = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      abrir();
      return;
    }
    if (!open) return;
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFoco((f) => Math.min(f + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFoco((f) => Math.max(f - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[foco];
      if (o) elegir(o.value);
    }
  };

  const borde = invalido ? "border-dc-pink ring-1 ring-dc-pink" : "border-dc-line";

  return (
    <div className={`relative ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : abrir())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border ${borde} bg-dc-deeper px-3 py-1.5 text-sm shadow-sm outline-none transition focus:border-dc-peri disabled:opacity-60`}
      >
        <span className={`truncate ${seleccionada ? "text-dc-text" : "text-dc-muted"}`}>
          {seleccionada?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 text-dc-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listaRef}
          role="listbox"
          className="dc-menu dc-pop-in absolute z-40 mt-1.5 max-h-64 w-full min-w-max overflow-auto rounded-xl border border-dc-line bg-dc-deep p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {options.map((o, i) => {
            const activa = o.value === value;
            const enfocada = i === foco;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => elegir(o.value)}
                  onMouseEnter={() => setFoco(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activa
                      ? "bg-dc-peri/20 text-white [text-shadow:0_0_10px_rgba(255,145,255,0.4)]"
                      : enfocada
                        ? "bg-dc-line/50 text-dc-text"
                        : "text-dc-muted"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {activa && (
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-dc-pink">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
