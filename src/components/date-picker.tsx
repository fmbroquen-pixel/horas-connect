"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  POPOVER_FLOTANTE,
  usePopoverFlotante,
} from "@/components/ui/popover-flotante";

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
//
// Modo rango (opcional): si se pasan rangeStart/rangeEnd, se destaca todo el
// tramo (extremos sólidos + días intermedios en banda tenue) además del día
// que controla esta instancia. Pensado para pares "Fecha inicio"/"Fecha fin"
// que muestran el mismo rango desde sus dos calendarios. Sin esos props, el
// comportamiento es idéntico al de un selector de fecha única.
export function DatePicker({
  name,
  value,
  onChange,
  max,
  min,
  rangeStart,
  rangeEnd,
  placeholder = "dd/mm/aaaa",
  invalido = false,
  ariaLabel,
  className = "",
  autoAbrir = false,
  onCerrar,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  rangeStart?: string;
  rangeEnd?: string;
  placeholder?: string;
  invalido?: boolean;
  ariaLabel?: string;
  className?: string;
  // Montar ya desplegado. Lo usan las celdas editables de las tablas: el
  // mismo clic que entra en edición abre el calendario.
  autoAbrir?: boolean;
  // Se dispara cada vez que el calendario se cierra (eligiendo, con Escape,
  // tabulando o clickeando afuera) para que la celda salga del modo edición.
  onCerrar?: () => void;
}) {
  const [open, setOpen] = useState(autoAbrir);
  // El calendario se dibuja en un portal sobre el <body>: dentro de una tabla
  // con scroll, en el flujo normal quedaría recortado por el overflow del
  // contenedor.
  const popRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<Date>(() => fromISO(value) ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  usePopoverFlotante(open, ref, popRef);

  const maxDate = max ? fromISO(max) : null;
  const minDate = min ? fromISO(min) : null;
  // "||" (no "??"): un rangeStart/rangeEnd vacío ("") también debe caer al
  // valor propio de esta instancia, no solo cuando es undefined.
  const rStart = fromISO(rangeStart || value);
  const rEnd = fromISO(rangeEnd || value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      // El calendario vive en un portal, así que no alcanza con mirar dentro
      // del trigger: hay que excluirlo aparte.
      const dentro =
        ref.current?.contains(e.target as Node) ||
        popRef.current?.contains(e.target as Node);
      if (!dentro) {
        // No se llama a `cerrar` para no re-suscribir el listener en cada
        // render: onCerrar llega como prop y cambia de identidad siempre.
        setOpen(false);
        onCerrar?.();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onCerrar]);

  const cerrar = () => {
    setOpen(false);
    onCerrar?.();
  };

  const abrir = () => {
    // Sin un valor cargado, el calendario abre siempre en HOY (no en el
    // límite inferior/superior permitido): solo se ajusta al borde más
    // cercano si hoy mismo cae fuera del rango habilitado.
    let inicial = fromISO(value);
    if (!inicial) {
      inicial = new Date();
      if (maxDate && inicial > maxDate) inicial = maxDate;
      if (minDate && inicial < minDate) inicial = minDate;
    }
    setCursor(inicial);
    setOpen(true);
  };

  const fueraDeRango = (d: Date) =>
    (maxDate ? d > maxDate : false) || (minDate ? d < minDate : false);

  const elegir = (d: Date) => {
    if (fueraDeRango(d)) return;
    onChange(toISO(d));
    cerrar();
    // Devolver el foco al trigger para poder tabular al siguiente campo.
    setTimeout(() => ref.current?.querySelector("button")?.focus(), 0);
  };

  const moverCursor = (dias: number) => {
    setCursor((c) => {
      const n = new Date(c);
      n.setDate(n.getDate() + dias);
      if (maxDate && n > maxDate) return maxDate;
      if (minDate && n < minDate) return minDate;
      return n;
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
      cerrar();
    } else if (e.key === "Tab") {
      cerrar(); // confirma y deja continuar la tabulación natural
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

  return (
    <div className={`relative ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? cerrar() : abrir())}
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

      {open && typeof document !== "undefined" &&
        createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label="Elegir fecha"
          onKeyDown={onKeyDown}
          className={`${POPOVER_FLOTANTE} w-64 p-3`}
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

          <div className="grid grid-cols-7 gap-x-0 gap-y-0.5">
            {celdas.map((d) => {
              const iso = toISO(d);
              const otroMes = d.getMonth() !== cursor.getMonth();
              const foco = iso === toISO(cursor);
              const deshab = fueraDeRango(d);

              const rangoValido = rStart && rEnd && rStart.getTime() <= rEnd.getTime();
              const esInicio = rangoValido && iso === toISO(rStart!);
              const esFin = rangoValido && iso === toISO(rEnd!);
              const esUnico = esInicio && esFin;
              const enRango = rangoValido && d > rStart! && d < rEnd!;

              let redondeo = "rounded-lg";
              let base = otroMes
                ? "text-dc-muted/40 hover:bg-dc-line/30"
                : "text-dc-text hover:bg-dc-line/40";
              if (esInicio || esFin) {
                base =
                  "bg-dc-peri text-white [text-shadow:0_0_10px_rgba(255,145,255,0.45)] font-medium hover:brightness-110";
                redondeo = esUnico
                  ? "rounded-lg"
                  : esInicio
                    ? "rounded-l-lg rounded-r-none"
                    : "rounded-r-lg rounded-l-none";
              } else if (enRango) {
                base = "rounded-none bg-dc-peri/15 text-dc-text hover:bg-dc-peri/25";
                redondeo = "rounded-none";
              }

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={deshab}
                  onClick={() => elegir(d)}
                  className={`h-8 text-center text-sm transition ${redondeo} ${base} ${
                    foco && !deshab ? "ring-1 ring-inset ring-dc-peri" : ""
                  } disabled:cursor-not-allowed disabled:text-dc-muted/25 disabled:hover:bg-transparent`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
