"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { POPOVER_FLOTANTE, usePopoverFlotante } from "@/components/ui/popover-flotante";

export type OpcionTag = { value: string; label: string; dot?: string };

// Tag clickeable que abre un popover chico con las opciones disponibles.
// A diferencia de Dropdown (components/dropdown.tsx), el trigger no se ve
// como un input con borde: es una pastilla, pensada para vivir dentro de una
// lista ejecutiva sin parecer un formulario. Guarda al elegir y cierra solo.
//
// El menú se dibuja en un portal sobre el <body>: la lista de proyectos del
// Home tiene su propio scroll, y un popover en el flujo quedaba recortado por
// ese overflow en las últimas filas. El hook lo ubica solo —abajo si entra,
// arriba si no; centrado sobre la pastilla— y lo mantiene dentro del
// viewport. Es el mismo mecanismo del desplegable, el date picker y el info
// button: un solo popover en toda la app.
export function TagPopover({
  valor,
  opciones,
  placeholder,
  onElegir,
  ariaLabel,
  anchoMenu = "w-48",
}: {
  valor: string;
  opciones: OpcionTag[];
  placeholder: string;
  onElegir: (v: string) => void;
  ariaLabel: string;
  anchoMenu?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  usePopoverFlotante(open, triggerRef, menuRef, { centrar: true });

  useEffect(() => {
    if (!open) return;
    // El menú vive en el portal, fuera del trigger: "afuera" es afuera de los
    // dos, o un click sobre una opción lo cerraría antes de elegirla.
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
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
    <div className="inline-block w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`inline-flex w-full items-center justify-center gap-1.5 truncate rounded-full px-2.5 py-1 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri ${
          seleccionada
            ? "bg-dc-peri/15 text-dc-peri hover:bg-dc-peri/25"
            : "bg-dc-line text-dc-muted hover:bg-dc-line/70"
        }`}
      >
        {seleccionada?.dot && (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: seleccionada.dot,
              // Glow suave del color del estado, sin llegar a neón.
              boxShadow: `0 0 6px ${seleccionada.dot}`,
            }}
          />
        )}
        <span className="truncate">{seleccionada?.label ?? placeholder}</span>
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className={`${POPOVER_FLOTANTE} max-h-60 space-y-1 overflow-y-auto p-1.5 ${anchoMenu}`}
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
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activa
                        ? "bg-dc-peri/20 text-white"
                        : "text-dc-muted hover:bg-dc-line/60 hover:text-dc-text"
                    }`}
                  >
                    {o.dot && (
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: o.dot,
                          boxShadow: `0 0 6px ${o.dot}`,
                        }}
                      />
                    )}
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
