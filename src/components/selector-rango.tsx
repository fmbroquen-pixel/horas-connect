"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ATRIBUTO_POPOVER,
  POPOVER_FLOTANTE,
  usePopoverFlotante,
} from "@/components/ui/popover-flotante";
import { DIAS_SEMANA, MESES, fmtDisplay, fromISO, offsetLunes, toISO } from "@/lib/fecha-iso";

// Un rango de fechas se elige en UN calendario, no en dos.
//
// Antes los filtros tenían dos date pickers sueltos, uno por extremo. Eso
// obliga a abrir, elegir, cerrar y repetir para algo que la persona piensa
// como un solo gesto ("del 1 al 15"), y además deja que los dos extremos se
// contradigan. Este selector es el mismo modelo que el calendario de tareas de
// Follow Up: primer día, segundo día, listo.
//
// Dos formas de hacerlo, porque cada una es natural para alguien distinto:
// clic en el inicio y clic en el fin, o mantener apretado desde el inicio y
// soltar en el fin. Las dos salen del mismo par mousedown/mouseup y por eso no
// hay que elegir una.
//
// A diferencia del de Follow Up, acá los fines de semana se pueden elegir: allá
// una tarea no puede empezar un sábado porque el plan se secuencia en días
// hábiles, pero un filtro tiene que poder mirar cualquier día.
export function SelectorRango({
  desde,
  hasta,
  onChange,
  onCerrar,
  max,
  className = "",
}: {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  // Se llama al cerrar el calendario. Es el momento en que el filtro se
  // aplica: no hay botón Aplicar, cerrar ES confirmar.
  onCerrar?: () => void;
  // Tope superior (normalmente hoy): no tiene sentido filtrar el futuro.
  max?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  // Inicio ya elegido, esperando el fin. Null = no hay nada a medias.
  const [parcial, setParcial] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cursor, setCursor] = useState<Date>(
    () => fromISO(desde) ?? fromISO(hasta) ?? new Date(),
  );

  const anclaRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  usePopoverFlotante(abierto, anclaRef, popRef);

  // Soltar fuera de la grilla termina el arrastre pero NO el rango: queda el
  // inicio elegido y el segundo clic lo cierra. Sin esto, un arrastre que se
  // pasa del calendario dejaba el componente creyendo que seguía apretado.
  useEffect(() => {
    if (!arrastrando) return;
    const soltar = () => setArrastrando(false);
    window.addEventListener("mouseup", soltar);
    return () => window.removeEventListener("mouseup", soltar);
  }, [arrastrando]);

  const cerrar = () => {
    setParcial(null);
    setHover(null);
    setArrastrando(false);
    setAbierto(false);
    onCerrar?.();
  };

  // Clic afuera del calendario: se cierra y el cierre aplica. "Afuera" es
  // afuera del calendario, no del panel de filtros: elegir el rango y seguir
  // tocando los proyectos tiene que confirmar las fechas igual.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anclaRef.current?.contains(t)) return;
      cerrar();
    };
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
  });

  useEffect(() => {
    if (!abierto) return;
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar();
      }
    };
    document.addEventListener("keydown", alTeclado);
    return () => document.removeEventListener("keydown", alTeclado);
  });

  const abrir = () => {
    // Al abrir se ve el rango aplicado y el mes de su inicio.
    setCursor(fromISO(desde) ?? fromISO(hasta) ?? new Date());
    setParcial(null);
    setHover(null);
    setAbierto(true);
  };

  const cerrarRango = (a: string, b: string) => {
    const [ini, fin] = a <= b ? [a, b] : [b, a];
    onChange(ini, fin);
    setParcial(null);
    setHover(null);
    setArrastrando(false);
    // El calendario NO se cierra: el filtro se aplica desde su propio botón,
    // y así se puede corregir el rango sin volver a abrir.
  };

  const maxISO = max || "";
  const deshabilitado = (iso: string) => Boolean(maxISO) && iso > maxISO;

  const apretar = (iso: string) => {
    if (deshabilitado(iso)) return;
    if (parcial === null) {
      setParcial(iso);
      setHover(iso);
      setArrastrando(true);
      return;
    }
    // Segundo clic: cierra el rango.
    cerrarRango(parcial, iso);
  };

  const soltarEn = (iso: string) => {
    if (!arrastrando || parcial === null || deshabilitado(iso)) return;
    // Soltar en el mismo día donde se apretó es un clic, no un arrastre: se
    // deja el inicio marcado esperando el segundo clic.
    if (iso === parcial) {
      setArrastrando(false);
      return;
    }
    cerrarRango(parcial, iso);
  };

  // Lo que se pinta: el rango que se está armando (siguiendo el mouse) o el
  // que ya está elegido.
  const [pintaIni, pintaFin] = parcial
    ? [parcial, hover ?? parcial].sort()
    : [desde, hasta].sort();

  const primero = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const inicioGrilla = new Date(primero);
  inicioGrilla.setDate(1 - offsetLunes(primero));
  const dias = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrilla);
    d.setDate(inicioGrilla.getDate() + i);
    return d;
  });

  const moverMes = (delta: number) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

  const etiqueta =
    desde && hasta
      ? `${fmtDisplay(desde)} – ${fmtDisplay(hasta)}`
      : desde || hasta
        ? `${fmtDisplay(desde || hasta)} – …`
        : "Elegí un rango";

  return (
    <>
      <button
        ref={anclaRef}
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Rango de fechas"
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm outline-none transition hover:border-dc-peri focus-visible:border-dc-peri ${
          desde || hasta ? "text-dc-text" : "text-dc-muted"
        } ${className}`}
      >
        <span className="truncate">{etiqueta}</span>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-dc-muted">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            {...{ [ATRIBUTO_POPOVER]: "" }}
            className={`${POPOVER_FLOTANTE} w-72 p-3`}
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                aria-label="Mes anterior"
                className="rounded-lg p-1 text-dc-muted transition hover:bg-dc-peri/10 hover:text-dc-text"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-xs uppercase tracking-wide text-dc-text">
                {MESES[cursor.getMonth()]} {cursor.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => moverMes(1)}
                aria-label="Mes siguiente"
                className="rounded-lg p-1 text-dc-muted transition hover:bg-dc-peri/10 hover:text-dc-text"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-dc-muted">
              {DIAS_SEMANA.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* select-none: sin esto, arrastrar sobre el calendario selecciona
                los números como si fueran texto y el gesto se ve sucio. */}
            <div
              className="grid select-none grid-cols-7 gap-y-0.5"
              onMouseOut={() => !arrastrando && setHover(null)}
            >
              {dias.map((d) => {
                const iso = toISO(d);
                const otroMes = d.getMonth() !== cursor.getMonth();
                const off = deshabilitado(iso);
                const esIni = Boolean(pintaIni) && iso === pintaIni;
                const esFin = Boolean(pintaFin) && iso === pintaFin;
                const dentro =
                  Boolean(pintaIni) &&
                  Boolean(pintaFin) &&
                  iso > pintaIni &&
                  iso < pintaFin;

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={off}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      apretar(iso);
                    }}
                    // onMouseOver y no onMouseEnter: enter/leave los sintetiza
                    // React a partir de otros eventos y no siempre llegan; over
                    // burbujea de forma nativa y acá alcanza igual, porque cada
                    // día es una hoja del árbol.
                    onMouseOver={() => setHover(iso)}
                    onMouseUp={() => soltarEn(iso)}
                    className={`h-8 text-sm tabular-nums transition ${
                      esIni || esFin
                        ? "bg-dc-purple text-white"
                        : dentro
                          ? "bg-dc-peri/25 text-dc-text"
                          : off
                            ? "text-dc-muted/40"
                            : otroMes
                              ? "text-dc-muted/60 hover:bg-dc-peri/10"
                              : "text-dc-text hover:bg-dc-peri/10"
                    } ${esIni ? "rounded-l-lg" : ""} ${esFin ? "rounded-r-lg" : ""} ${
                      !esIni && !esFin && !dentro ? "rounded-lg" : ""
                    } ${off ? "cursor-not-allowed" : ""}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[11px] text-dc-muted">
              {parcial
                ? "Elegí el fin del rango"
                : "Clic en el inicio y en el fin, o arrastrá"}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
