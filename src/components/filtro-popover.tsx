"use client";

import { useEffect, useRef, useState } from "react";
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";

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
}: {
  basePath: string;
  desde: string;
  hasta: string;
  proyectoId: string;
  proyectos: Proyecto[];
  maxHoy: string;
  soloFechas?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [proyectoSel, setProyectoSel] = useState(proyectoId);
  const [desdeSel, setDesdeSel] = useState(desde);
  const [hastaSel, setHastaSel] = useState(hasta);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const proyectoNombre = proyectos.find((p) => p.id === proyectoId)?.nombre;
  const hayRango = Boolean(desde || hasta);
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
          className="flex items-center gap-1.5 rounded-lg border border-dc-line px-3 py-1.5 text-sm text-dc-muted transition hover:border-dc-peri hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Filtrar
        </button>

        {open && (
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-dc-line bg-dc-deep p-4 shadow-xl">
            <form method="GET" action={basePath} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-dc-muted">Desde</label>
                  <DatePicker
                    name="desde"
                    value={desdeSel}
                    onChange={setDesdeSel}
                    max={maxHoy || undefined}
                    className="w-full"
                    ariaLabel="Desde"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-dc-muted">Hasta</label>
                  <DatePicker
                    name="hasta"
                    value={hastaSel}
                    onChange={setHastaSel}
                    max={maxHoy || undefined}
                    className="w-full"
                    ariaLabel="Hasta"
                  />
                </div>
              </div>
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
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" className={BTN_PRIMARY_SM}>
                  Aplicar
                </button>
                <a href={basePath} className={BTN_SECONDARY_SM}>
                  Limpiar
                </a>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
