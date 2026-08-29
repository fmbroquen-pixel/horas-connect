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
  activa,
}: {
  etapas: EtapaProxima[];
  hasta: string; // dd/mm de corte de la ventana
  // Solo tiene sentido parada en el mes actual: la ventana se cuenta desde
  // HOY, así que mirándola desde un mes anterior mostraría cosas que arrancan
  // después del mes que se está viendo. Ver el comentario de standby abajo.
  activa: boolean;
}) {
  const [filtro, setFiltro] = useState("todas");

  const visibles =
    filtro === "todas"
      ? etapas
      : etapas.filter((e) => String(e.personas) === filtro);

  return (
    // min-w-0 en la raíz: esta card es un grid item, y los grid items arrancan
    // con min-width:auto, o sea que NO bajan del ancho mínimo de su contenido
    // aunque el track mida menos. Sin esto la card se plantaba en su ancho
    // natural y se salía de la columna.
    // En standby la card no se esconde ni se achica: sigue ocupando su lugar
    // para que la columna no se reacomode al cambiar de mes, y baja de
    // opacidad para que se lea como apagada y no como vacía.
    <div
      aria-disabled={!activa}
      // flex-1 y no solo flex: por defecto un ítem flex encoge cuando el
      // contenido sobra pero no estira cuando falta (grow 0). Con la lista
      // llena eso alcanzaba —encogía a los 30rem de la fila—, pero en standby
      // el cuerpo es una línea de texto y la card se quedaba en 135px al lado
      // de una de 480. Con grow queda del alto de su fila en los dos estados.
      className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-dc-line bg-dc-card p-5 transition-opacity duration-300 ${
        activa ? "" : "opacity-50"
      }`}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <h2 className="text-base font-semibold text-white">Próximas dos semanas</h2>
          {/* La fecha de corte no se muestra en standby: es exactamente la
              mezcla de tiempos que se quiere evitar (un corte futuro al pie de
              un mes pasado). */}
          {activa && <span className="text-xs text-dc-muted">hasta {hasta}</span>}
          <InfoButton>
            Tareas sin iniciar que arrancan en los próximos 14 días, contados
            desde hoy. Por eso solo está activa en el mes actual: en un mes
            anterior queda en standby. El filtro de proyectos sí la modifica.
          </InfoButton>
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-lg border border-dc-line bg-dc-deeper p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              disabled={!activa}
              aria-pressed={filtro === f.value}
              data-tooltip={activa ? f.label : "Disponible en el mes actual"}
              aria-label={f.label}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs tabular-nums transition disabled:cursor-not-allowed ${
                filtro === f.value
                  ? "bg-dc-peri/20 text-dc-text"
                  : `text-dc-muted ${activa ? "hover:text-dc-text" : ""}`
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

      {!activa ? (
        // Ocupa el alto que le toca en vez de encogerse al texto: el standby
        // dura todo el mes que se esté mirando, y una card de 135px al lado de
        // una de 480 se lee como algo roto, no como algo apagado.
        <p className="flex min-h-0 flex-1 items-center justify-center text-sm text-dc-muted">
          Disponible en el mes actual.
        </p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-dc-muted">
          {etapas.length === 0
            ? "No hay etapas que arranquen en los próximos 14 días."
            : "Ninguna coincide con este filtro."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto overflow-x-hidden">
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
                          data-tooltip={`Personas involucradas: ${e.personas}`}
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
