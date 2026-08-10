"use client";

import Link from "next/link";
import { useState } from "react";
import { InfoButton } from "@/components/info-button";

export type EtapaProxima = {
  id: string;
  clienteId: string;
  listaId: string;
  proyecto: string;
  tarea: string;
  fecha: string; // dd/mm
  diasRestantes: number;
  personas: number;
};

// Filtro por cantidad de personas, con el mismo ícono que usa la tarea en
// Follow Up: una silueta para 1, dos para 2. La cantidad se reconoce por la
// forma, sin leer.
const FILTROS = [
  { value: "todas", label: "Todas", personas: 0 },
  { value: "1", label: "1 persona", personas: 1 },
  { value: "2", label: "2 personas", personas: 2 },
];

function IconoPersonas({ dos }: { dos: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      {dos && <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />}
    </svg>
  );
}

// Qué arranca en las próximas dos semanas. La ventana es fija hacia adelante
// y por eso el encabezado muestra la fecha de corte: que se lea distinta a la
// del filtro de fechas es lo que evita la duda de si la card lo respeta.
//
// Cada ítem enlaza a SU TAREA dentro del Follow Up del proyecto, no solo al
// proyecto: la card no es un aviso, es un punto de entrada al trabajo que se
// viene, y dejar a la persona en un plan de 70 tareas buscando cuál era no
// es llegar. El enlace viaja con los ids de lista y tarea —nunca con los
// nombres, que se repiten entre proyectos— y del otro lado la lista se abre,
// la fila se centra y se enciende un momento.
//
// La lista va ordenada por fecha y sin cortes por semana; la urgencia la
// marca el color de la fecha.
export function EtapasProximas({
  etapas,
  hasta,
}: {
  etapas: EtapaProxima[];
  hasta: string; // dd/mm de corte de la ventana
}) {
  const [filtro, setFiltro] = useState("todas");

  const visibles =
    filtro === "todas"
      ? etapas
      : etapas.filter((e) => String(e.personas) === filtro);

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-dc-line bg-dc-card p-5">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <h2 className="text-base font-semibold text-white">Próximas dos semanas</h2>
          <span className="text-xs text-dc-muted">hasta {hasta}</span>
          <InfoButton>
            Tareas sin iniciar que arrancan en los próximos 14 días. Esta card
            usa siempre esa ventana hacia adelante, así que el filtro de fechas
            de arriba no la modifica; el de proyectos sí.
          </InfoButton>
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-lg border border-dc-line bg-dc-deeper p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              aria-pressed={filtro === f.value}
              title={f.label}
              aria-label={f.label}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs tabular-nums transition ${
                filtro === f.value
                  ? "bg-dc-peri/20 text-dc-text"
                  : "text-dc-muted hover:text-dc-text"
              }`}
            >
              {f.personas === 0 ? (
                "Todas"
              ) : (
                <>
                  <IconoPersonas dos={f.personas === 2} />
                  {f.personas}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-dc-muted">
          {etapas.length === 0
            ? "No hay etapas que arranquen en los próximos 14 días."
            : "Ninguna coincide con este filtro."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto">
          {visibles.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/proyectos/${e.clienteId}/follow-up?lista=${e.listaId}&tarea=${e.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm transition hover:bg-dc-peri/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-dc-text">{e.tarea}</span>
                        <span className="block truncate text-xs text-dc-muted">
                          {e.proyecto}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs">
                        <span
                          className="inline-flex items-center gap-1 text-dc-muted"
                          title={`Personas involucradas: ${e.personas}`}
                        >
                          <IconoPersonas dos={e.personas === 2} />
                          {e.personas}
                        </span>
                        {/* Lo que arranca en 3 días o menos se resalta: es
                            donde todavía se llega a mover algo. */}
                        <span
                          className={`tabular-nums ${
                            e.diasRestantes <= 3 ? "text-dc-pink" : "text-dc-peri"
                          }`}
                        >
                          {e.fecha}
                        </span>
                      </span>
                    </Link>
                  </li>
          ))}
        </ul>
      )}
    </div>
  );
}
