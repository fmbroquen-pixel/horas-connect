"use client";

import { useState } from "react";

export type EtapaProxima = {
  id: string;
  proyecto: string;
  tarea: string;
  fecha: string; // dd/mm
  personas: number;
};

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "1", label: "1 persona" },
  { value: "2", label: "2 personas" },
];

// Qué arranca en las próximas dos semanas. Sirve para anticipar carga: el
// filtro por personas responde "¿cuánto de esto necesita a dos mentores?".
//
// El filtro es local y no viaja en la URL: acota esta card y nada más, a
// diferencia de los filtros de fecha y proyecto, que gobiernan toda la
// pantalla.
export function EtapasProximas({ etapas }: { etapas: EtapaProxima[] }) {
  const [filtro, setFiltro] = useState("todas");

  const visibles =
    filtro === "todas"
      ? etapas
      : etapas.filter((e) => String(e.personas) === filtro);

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-dc-line bg-dc-card p-5">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">
          Etapas próximas
          <span className="ml-1.5 text-xs font-normal text-dc-muted">2 semanas</span>
        </h2>
        <div className="inline-flex items-center gap-1 rounded-lg border border-dc-line bg-dc-deeper p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              aria-pressed={filtro === f.value}
              className={`rounded-md px-2 py-1 text-xs transition ${
                filtro === f.value
                  ? "bg-dc-peri/20 text-dc-text"
                  : "text-dc-muted hover:text-dc-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-dc-muted">
          {etapas.length === 0
            ? "No hay etapas que arranquen en las próximas dos semanas."
            : "Ninguna coincide con este filtro."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto">
          {visibles.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-dc-text">{e.tarea}</p>
                <p className="truncate text-xs text-dc-muted">{e.proyecto}</p>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                <span
                  className="inline-flex items-center gap-1 text-dc-muted"
                  title={`Personas involucradas: ${e.personas}`}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    {e.personas === 2 && (
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    )}
                  </svg>
                  {e.personas}
                </span>
                <span className="tabular-nums text-dc-peri">{e.fecha}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
