"use client";

import { useEffect, useRef, useState } from "react";
import { dentroDeUnPopover } from "@/components/ui/popover-flotante";
import { BTN_SECONDARY_SM } from "@/lib/ui";
import { useRecalculo } from "./recalculo";

type Proyecto = { id: string; nombre: string };

// Filtro de proyectos del Home. El período lo maneja el selector mensual de
// al lado: acá quedó solo la selección múltiple de proyectos, que es lo único
// propio de esta pantalla —el resto de la app filtra por un proyecto.
export function FiltrosHome({
  anio,
  mes,
  proyectos,
  seleccionados,
}: {
  // Viajan en la URL junto con los proyectos, para no perder el mes al
  // cambiar la selección.
  anio: number;
  mes: number;
  proyectos: Proyecto[];
  seleccionados: string[];
}) {
  const { recalculando, navegar } = useRecalculo();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const ref = useRef<HTMLDivElement>(null);


  const todos = proyectos.length > 0 && sel.size === proyectos.length;

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const aplicar = () => {
    const params = new URLSearchParams();
    params.set("anio", String(anio));
    params.set("mes", String(mes));
    // "Todos" no viaja en la URL: es el default y así el link queda limpio.
    if (sel.size > 0 && sel.size < proyectos.length) {
      params.set("proyectos", [...sel].join(","));
    }
    navegar(`/dashboard?${params.toString()}`);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      // Un clic en un desplegable NO cierra el panel: vive en un portal a
      // <body>, así que para `contains` cae afuera aunque se vea adentro.
      if (dentroDeUnPopover(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Cerrar el panel confirma: no hay botón Aplicar.
        aplicar();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
    // Sin array de dependencias: el efecto tiene que ver el `aplicar` de
    // este render, con los proyectos actuales.
  });

  // Limpiar vacía la selección y NO cierra ni navega: es el punto de partida
  // para armar un filtro nuevo, no un "volver a todos".
  const limpiar = () => setSel(new Set());

  const parcial = seleccionados.length < proyectos.length;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full border border-dc-line bg-dc-card px-3 py-1 text-xs text-dc-muted sm:inline-flex">
        <span className="text-dc-peri">Proyectos&nbsp;→&nbsp;</span>
        <span className="text-dc-text">
          {parcial
            ? `${seleccionados.length} de ${proyectos.length}`
            : "Todos"}
        </span>
      </span>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Filtrar"
          aria-label="Filtrar"
          aria-expanded={open}
          className="flex items-center rounded-lg border border-dc-line p-1.5 text-dc-muted transition hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
        </button>

        {open && (
          <div className="dc-menu dc-pop-in absolute right-0 z-40 mt-2 w-80 rounded-xl border border-dc-line bg-dc-deep p-4 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-dc-muted">Proyectos</span>
                <button
                  type="button"
                  onClick={() =>
                    setSel(todos ? new Set() : new Set(proyectos.map((p) => p.id)))
                  }
                  className="text-xs text-dc-peri transition hover:text-dc-pink"
                >
                  {todos ? "Ninguno" : "Todos"}
                </button>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-dc-line p-2">
                {proyectos.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-dc-text transition hover:bg-dc-line/40"
                  >
                    <input
                      type="checkbox"
                      checked={sel.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 shrink-0 accent-dc-purple"
                    />
                    <span className="truncate">{p.nombre}</span>
                  </label>
                ))}
                {proyectos.length === 0 && (
                  <p className="px-2 py-1 text-xs text-dc-muted">
                    No tenés proyectos asignados.
                  </p>
                )}
              </div>
            </div>

            {/* Sin botón Aplicar: se confirma al cerrar el panel. */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-[11px] text-dc-muted">
                {recalculando ? "Actualizando…" : "Se aplica al cerrar"}
              </span>
              <button
                type="button"
                onClick={limpiar}
                disabled={sel.size === 0}
                className={`${BTN_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
