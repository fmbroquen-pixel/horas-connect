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
  soloPunto = false,
  soloLectura = false,
  motivoSoloLectura,
  tooltip,
}: {
  valor: string;
  opciones: OpcionTag[];
  placeholder: string;
  onElegir: (v: string) => void;
  ariaLabel: string;
  anchoMenu?: string;
  // Solo el punto de color, sin la etiqueta. Lo usa el semáforo: son tres
  // estados que ya se distinguen por color, y repetir "Verde" al lado de un
  // punto verde es ruido en una columna que se escanea de arriba abajo. El
  // nombre sigue estando en el tooltip y en el aria-label.
  soloPunto?: boolean;
  // Se muestra pero no se puede cambiar. Lo usa el Home con los proyectos
  // inactivos: siguen apareciendo en el mes en que operaban, pero elegir otro
  // valor escribiria una fila nueva sobre un cliente que dejo de operar.
  soloLectura?: boolean;
  // Por que no se puede tocar. Sin esto, un control que no responde se lee
  // como algo roto.
  motivoSoloLectura?: string;
  // Reemplaza al tooltip por defecto -que en modo punto es la etiqueta-. Lo
  // usa el Home del proyecto para conservar el "Ultimo cambio: Verde ·
  // 31/08/2026" que mostraba Follow Up: ahi hay lugar para el historial, y en
  // una lista de veinte filas no.
  tooltip?: string;
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
  const etiqueta = seleccionada?.label ?? placeholder;

  return (
    <div className={soloPunto ? "inline-block" : "inline-block w-full"}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (soloLectura) return;
          setOpen((o) => !o);
        }}
        disabled={soloLectura}
        aria-haspopup={soloLectura ? undefined : "listbox"}
        aria-expanded={soloLectura ? undefined : open}
        // El estado entra en el nombre accesible: sin la etiqueta a la vista,
        // es lo único que lo dice para quien no ve el color.
        aria-label={`${ariaLabel}: ${etiqueta}`}
        data-tooltip={
          soloLectura
            ? motivoSoloLectura
            : (tooltip ?? (soloPunto ? etiqueta : undefined))
        }
        className={
          soloPunto
            ? `inline-flex h-7 w-7 items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri ${
                soloLectura ? "cursor-not-allowed opacity-50" : "hover:bg-dc-line/60"
              }`
            : `inline-flex w-full items-center justify-center gap-1.5 truncate rounded-full px-2.5 py-1 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri ${
                soloLectura
                  ? "cursor-not-allowed bg-dc-line/60 text-dc-muted opacity-60"
                  : seleccionada
                    ? "bg-dc-peri/15 text-dc-peri hover:bg-dc-peri/25"
                    : "bg-dc-line text-dc-muted hover:bg-dc-line/70"
              }`
        }
      >
        {soloPunto ? (
          // Sin estado cargado queda un aro vacío: tiene que seguir habiendo
          // algo que se vea y se pueda tocar.
          <span
            aria-hidden
            className={`block h-3.5 w-3.5 rounded-full ${
              seleccionada?.dot ? "" : "border-2 border-dc-muted/50"
            }`}
            style={
              seleccionada?.dot
                ? {
                    backgroundColor: seleccionada.dot,
                    boxShadow: `0 0 8px ${seleccionada.dot}`,
                  }
                : undefined
            }
          />
        ) : (
          <>
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
            <span className="truncate">{etiqueta}</span>
          </>
        )}
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
