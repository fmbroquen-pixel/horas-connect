"use client";

import { useEffect, useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { dentroDeUnPopover } from "@/components/ui/popover-flotante";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { useRecalculo } from "./recalculo";

type Proyecto = { id: string; nombre: string };

function fmt(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Filtro del Home: rango de fechas + selección múltiple de proyectos. A
// diferencia del FiltroPopover del resto de la app (un solo proyecto), acá se
// eligen varios y el default —sin parámetro en la URL— son todos los
// accesibles: así el Home abre mostrando el panorama completo.
export function FiltrosHome({
  desde,
  hasta,
  maxHoy,
  proyectos,
  seleccionados,
}: {
  desde: string;
  hasta: string;
  maxHoy: string;
  proyectos: Proyecto[];
  seleccionados: string[];
}) {
  const { recalculando, navegar } = useRecalculo();
  const [open, setOpen] = useState(false);
  const [desdeSel, setDesdeSel] = useState(desde);
  const [hastaSel, setHastaSel] = useState(hasta);
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      // Un clic en el calendario o en un desplegable NO cierra el panel: viven
      // en un portal a <body>, así que para `contains` caen afuera aunque se
      // vean adentro.
      if (dentroDeUnPopover(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const todos = proyectos.length > 0 && sel.size === proyectos.length;

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const aplicar = () => {
    // Se ordena acá y no en los calendarios: elegir primero la fecha "grande"
    // es una forma legítima de armar un rango, y trabarla obliga a adivinar en
    // qué orden hay que tocar los campos.
    const invertido = desdeSel && hastaSel && desdeSel > hastaSel;
    const desdeFinal = invertido ? hastaSel : desdeSel;
    const hastaFinal = invertido ? desdeSel : hastaSel;

    const params = new URLSearchParams();
    if (desdeFinal) params.set("desde", desdeFinal);
    if (hastaFinal) params.set("hasta", hastaFinal);
    // "Todos" no viaja en la URL: es el default y así el link queda limpio.
    if (sel.size > 0 && sel.size < proyectos.length) {
      params.set("proyectos", [...sel].join(","));
    }
    const qs = params.toString();
    navegar(qs ? `/dashboard?${qs}` : "/dashboard");
    setOpen(false);
  };

  // Limpiar vacía fechas y selección y NO cierra ni navega: es el punto de
  // partida para armar un filtro nuevo, no un "volver a todos". Antes hacía
  // las tres cosas al revés —marcaba todos los proyectos, navegaba y cerraba—,
  // así que el botón que promete limpiar terminaba aplicando el filtro más
  // amplio posible y sacándote del popup.
  const limpiar = () => {
    setDesdeSel("");
    setHastaSel("");
    setSel(new Set());
  };

  const parcial = seleccionados.length < proyectos.length;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full border border-dc-line bg-dc-card px-3 py-1 text-xs text-dc-muted sm:inline-flex">
        <span className="text-dc-peri">Filtros activos&nbsp;→&nbsp;</span>
        <span className="text-dc-text">
          {fmt(desde)} – {fmt(hasta)}
        </span>
        <span className="text-dc-text">
          &nbsp;·&nbsp;
          {parcial
            ? `${seleccionados.length} de ${proyectos.length} proyectos`
            : "Todos los proyectos"}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-xs text-dc-muted">Desde</span>
                <DatePicker
                  value={desdeSel}
                  onChange={setDesdeSel}
                  max={maxHoy}
                  rangeStart={desdeSel}
                  rangeEnd={hastaSel}
                  className="w-full"
                  ariaLabel="Desde"
                />
              </div>
              <div>
                <span className="mb-1 block text-xs text-dc-muted">Hasta</span>
                {/* Los dos calendarios se limitan solo por hoy, igual que el
                    filtro del resto de la app. Antes se limitaban entre sí
                    —Desde no podía pasar de Hasta y Hasta no podía bajar de
                    Desde— y eso trababa la mitad de los rangos: para mover el
                    rango hacia adelante había que tocar Hasta primero y hacia
                    atrás Desde primero, así que quien empezaba siempre por
                    Desde se encontraba con los días en gris sin explicación.
                    Si el rango queda al revés se ordena al aplicar. */}
                <DatePicker
                  value={hastaSel}
                  onChange={setHastaSel}
                  max={maxHoy}
                  rangeStart={desdeSel}
                  rangeEnd={hastaSel}
                  className="w-full"
                  ariaLabel="Hasta"
                />
              </div>
            </div>

            <div className="mt-3">
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

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={limpiar}
                disabled={sel.size === 0 && !desdeSel && !hastaSel}
                className={`${BTN_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={aplicar}
                disabled={sel.size === 0 || recalculando}
                className={`${BTN_PRIMARY_SM} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {recalculando ? "Aplicando…" : "Aplicar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
