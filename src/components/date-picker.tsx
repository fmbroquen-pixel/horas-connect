"use client";

import { useEffect, useRef, useState } from "react";

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}
function fromISO(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [a, m, d] = s.split("-").map(Number);
  const date = new Date(a, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}
function fmtDisplay(s: string) {
  const d = fromISO(s);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
// Lunes = 0 … Domingo = 6
function offsetLunes(d: Date) {
  return (d.getDay() + 6) % 7;
}

// Selector de fecha propio (no <input type="date"> nativo): mismo lenguaje
// visual que Dropdown (bordes, radios, colores, menú flotante dc-menu) y
// navegable con teclado (↓ abre, flechas mueven, Enter selecciona, Esc cierra,
// Tab confirma y continúa). Expone un input hidden name=… con valor ISO.
export function DatePicker({
  name,
  value,
  onChange,
  max,
  placeholder = "dd/mm/aaaa",
  invalido = false,
  ariaLabel,
  className = "",
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  placeholder?: string;
  invalido?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<Date>(() => fromISO(value) ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  const maxDate = max ? fromISO(max) : null;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const abrir = () => {
    setCursor(fromISO(value) ?? maxDate ?? new Date());
    setOpen(true);
  };

  const excede = (d: Date) => (maxDate ? d > maxDate : false);

  const elegir = (d: Date) => {
    if (excede(d)) return;
    onChange(toISO(d));
    setOpen(false);
    // Devolver el foco al trigger para poder tabular al siguiente campo.
    setTimeout(() => ref.current?.querySelector("button")?.focus(), 0);
  };

  const moverCursor = (dias: number) => {
    setCursor((c) => {
      const n = new Date(c);
      n.setDate(n.getDate() + dias);
      return maxDate && n > maxDate ? maxDate : n;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false); // confirma y deja continuar la tabulación natural
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moverCursor(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moverCursor(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moverCursor(-7);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moverCursor(7);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, c.getDate()));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, c.getDate()));
    } else if (e.key === "Enter") {
      e.preventDefault();
      elegir(cursor);
    }
  };

  const borde = invalido ? "border-dc-pink ring-1 ring-dc-pink" : "border-dc-line";

  // Grilla de días del mes visible.
  const primero = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const inicioGrilla = new Date(primero);
  inicioGrilla.setDate(1 - offsetLunes(primero));
  const celdas: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioGrilla);
    d.setDate(inicioGrilla.getDate() + i);
    celdas.push(d);
  }
  const seleccionada = fromISO(value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : abrir())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border ${borde} bg-dc-deeper px-3 py-1.5 text-sm shadow-sm outline-none transition focus:border-dc-peri`}
      >
        <span className={`truncate ${value ? "text-dc-text" : "text-dc-muted"}`}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-dc-muted">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir fecha"
          onKeyDown={onKeyDown}
          className="dc-menu dc-pop-in absolute z-40 mt-1.5 w-64 rounded-xl border border-dc-line bg-dc-deep p-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Mes anterior" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="rounded-lg p-1 text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="text-sm text-dc-text">
              {MESES[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <button type="button" aria-label="Mes siguiente" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="rounded-lg p-1 text-dc-muted transition hover:bg-dc-line/50 hover:text-dc-text">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-dc-muted">
            {DIAS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {celdas.map((d) => {
              const otroMes = d.getMonth() !== cursor.getMonth();
              const sel = seleccionada && toISO(d) === toISO(seleccionada);
              const foco = toISO(d) === toISO(cursor);
              const deshab = excede(d);
              return (
                <button
                  key={toISO(d)}
                  type="button"
                  disabled={deshab}
                  onClick={() => elegir(d)}
                  className={`h-8 rounded-lg text-center text-sm transition ${
                    sel
                      ? "bg-dc-peri/25 text-white [text-shadow:0_0_10px_rgba(255,145,255,0.4)]"
                      : foco
                        ? "bg-dc-line/50 text-dc-text"
                        : otroMes
                          ? "text-dc-muted/40"
                          : "text-dc-text hover:bg-dc-line/40"
                  } disabled:cursor-not-allowed disabled:text-dc-muted/25 disabled:hover:bg-transparent`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
