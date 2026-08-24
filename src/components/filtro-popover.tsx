"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_SECONDARY_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";
import { SelectorRango } from "@/components/selector-rango";
import { dentroDeUnPopover } from "@/components/ui/popover-flotante";

type Proyecto = { id: string; nombre: string };

function fmt(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function FiltroPopover({
  basePath,
  desde,
  hasta,
  proyectoId,
  proyectos,
  maxHoy,
  soloFechas = false,
  sinFechas = false,
}: {
  basePath: string;
  desde: string;
  hasta: string;
  proyectoId: string;
  proyectos: Proyecto[];
  maxHoy: string;
  soloFechas?: boolean;
  // Deja el panel solo con el filtro de proyecto. Lo usan las pantallas que
  // eligen el período con el selector mensual: ahí un rango libre además del
  // mes serían dos formas de decir lo mismo, y podrían contradecirse.
  sinFechas?: boolean;
}) {
  const router = useRouter();
  // La navegación va dentro de una transición: React mantiene la tabla actual
  // en pantalla mientras llega la nueva, en vez de parpadear en blanco.
  const [aplicando, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [proyectoSel, setProyectoSel] = useState(proyectoId);
  const [desdeSel, setDesdeSel] = useState(desde);
  const [hastaSel, setHastaSel] = useState(hasta);
  const ref = useRef<HTMLDivElement>(null);

  // No hay botón Aplicar: confirmar es cerrar. Un rango a medias nunca llega
  // hasta acá —el selector solo avisa cuando el rango está completo—, así que
  // no hay nada que validar.
  const aplicar = () => {
    const params = new URLSearchParams();
    if (!sinFechas && desdeSel) params.set("desde", desdeSel);
    if (!sinFechas && hastaSel) params.set("hasta", hastaSel);
    if (proyectoSel) params.set("proyecto", proyectoSel);
    const qs = params.toString();
    start(() => router.push(qs ? `${basePath}?${qs}` : basePath));
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      // Un clic en el calendario o en un desplegable NO cierra el panel: viven
      // en un portal a <body>, así que para `contains` caen afuera aunque se
      // vean adentro.
      if (dentroDeUnPopover(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        aplicar();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
    // Sin array de dependencias: el efecto necesita el `aplicar` de este
    // render, con los valores actuales.
  });

  const proyectoNombre = proyectos.find((p) => p.id === proyectoId)?.nombre;
  const hayRango = !sinFechas && Boolean(desde || hasta);
  const hayFiltro = hayRango || Boolean(proyectoId);

  return (
    <div className="flex items-center gap-2">
      {hayFiltro && (
        <span className="hidden rounded-full border border-dc-line bg-dc-card px-3 py-1 text-xs text-dc-muted sm:inline-flex">
          <span className="text-dc-peri">Filtros activos&nbsp;→&nbsp;</span>
          {hayRango && (
            <span className="text-dc-text">
              {fmt(desde)} – {fmt(hasta)}
            </span>
          )}
          {proyectoNombre && <span className="text-dc-text">&nbsp;· {proyectoNombre}</span>}
        </span>
      )}

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Filtrar"
          aria-label="Filtrar"
          className="flex items-center rounded-lg border border-dc-line p-1.5 text-dc-muted transition hover:border-dc-peri hover:bg-dc-peri/10 hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-dc-line bg-dc-deep p-4 shadow-xl">
            <div className="space-y-3">
              {!sinFechas && (
              <div>
                <label className="mb-1 block text-xs text-dc-muted">Período</label>
                <SelectorRango
                  desde={desdeSel}
                  hasta={hastaSel}
                  onChange={(d, h) => {
                    setDesdeSel(d);
                    setHastaSel(h);
                  }}
                  onCerrar={aplicar}
                  max={maxHoy || undefined}
                />
              </div>
              )}
              {!soloFechas && (
                <div>
                  <label className="mb-1 block text-xs text-dc-muted">Cliente</label>
                  <Dropdown
                    name="proyecto"
                    value={proyectoSel}
                    onChange={setProyectoSel}
                    options={[
                      { value: "", label: "Todos" },
                      ...proyectos.map((p) => ({ value: p.id, label: p.nombre })),
                    ]}
                    placeholder="Todos"
                    ariaLabel="Cliente"
                  />
                </div>
              )}
              {/* Sin botón Aplicar: se confirma al cerrar el calendario o el
                  panel. Limpiar sigue explícito porque vaciar no es algo que
                  uno haga sin querer. */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-dc-muted">
                  {aplicando ? "Actualizando…" : "Se aplica al cerrar"}
                </span>
                {/* Limpia los campos y deja el panel abierto: es el punto de
                    partida para armar otro filtro, no un "aplicar todo". Antes
                    era un enlace al listado sin filtros, así que limpiar
                    navegaba y cerraba de una. */}
                <button
                  type="button"
                  onClick={() => {
                    setDesdeSel("");
                    setHastaSel("");
                    setProyectoSel("");
                  }}
                  className={BTN_SECONDARY_SM}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
