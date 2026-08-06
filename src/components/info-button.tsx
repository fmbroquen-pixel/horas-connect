"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { POPOVER_FLOTANTE, usePopoverFlotante } from "@/components/ui/popover-flotante";

// Ícono de información con tooltip. En desktop se abre con hover y focus; en
// mobile con tap.
//
// El tooltip se dibuja en un portal sobre el <body> con `position: fixed`, no
// en el flujo: en una card angosta (Próximas dos semanas mide 20rem y el
// tooltip 320px) un popover absoluto se sale de la card, ensancha el layout y
// deja scroll horizontal en la pantalla. Fuera del flujo no empuja nada, y el
// hook lo ubica solo según el espacio disponible: abajo si entra, arriba si
// no; hacia la derecha del trigger, o hacia la izquierda cuando de ese lado no
// hay lugar.
export function InfoButton({ children }: { children: React.ReactNode }) {
  // `fijado` = abierto con click (o Enter). Sin esa distinción, salir con el
  // mouse del ícono cerraría el tooltip que el usuario acaba de fijar para
  // leerlo: ahora el hover solo cierra lo que el hover abrió.
  const [abierto, setAbierto] = useState(false);
  const [fijado, setFijado] = useState(false);
  const anclaRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  usePopoverFlotante(abierto, anclaRef, popRef);

  useEffect(() => {
    if (!abierto) return;

    const cerrar = () => {
      setAbierto(false);
      setFijado(false);
    };
    // El tooltip vive en el portal, fuera del ancla: "afuera" es afuera de los
    // dos, o un click sobre el propio tooltip lo cerraría.
    const alClic = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anclaRef.current?.contains(t) || popRef.current?.contains(t)) return;
      cerrar();
    };
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };

    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclado);
    };
  }, [abierto]);

  return (
    <span
      ref={anclaRef}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => {
        if (!fijado) setAbierto(false);
      }}
    >
      <button
        type="button"
        aria-label="Más información"
        aria-expanded={abierto}
        onClick={() => {
          setFijado(!fijado);
          setAbierto(!fijado);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          if (!fijado) setAbierto(false);
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-dc-line text-dc-muted transition hover:border-dc-peri hover:text-dc-text focus:border-dc-peri focus:text-dc-text focus:outline-none"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.5h.01" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <span
            ref={popRef}
            role="tooltip"
            className={`${POPOVER_FLOTANTE} block w-[320px] max-w-[calc(100vw-1rem)] px-3.5 py-2.5 text-xs font-normal normal-case leading-relaxed tracking-normal text-dc-muted`}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
