"use client";

import Link from "next/link";
import { InfoButton } from "@/components/info-button";
import { BotonCiclico } from "@/components/ui/boton-ciclico";
import { useCiclo } from "@/components/ui/usar-ciclo";
import { LINK_FILA } from "@/lib/ui";

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

// El horizonte de la card, en semanas. La consulta del servidor trae SIEMPRE
// las dos semanas -es el máximo- y acá se recorta a una. Por eso el cambio no
// pide nada: lo que se muestra con 1 ya está en pantalla, es un subconjunto.
const DIAS_POR_SEMANA = 7;

// Los dos ciclos de la card, en el orden en que rotan. Primero el estado, y
// el rótulo al lado: el botón muestra siempre el que está puesto.
const SEMANAS = ["1", "2"] as const;
const ROTULO_SEMANAS: Record<string, string> = {
  "1": "1 semana",
  "2": "2 semanas",
};

// Todas → 2 personas → 1 persona → Todas. Las de dos van antes: son las que
// necesitan coordinar agenda entre mentores, así que es lo que se busca
// primero al revisar lo que viene.
const PERSONAS = ["todas", "2", "1"] as const;
const ROTULO_PERSONAS: Record<string, string> = {
  todas: "Todas",
  "2": "2 personas",
  "1": "1 persona",
};

// La que viene después en el ciclo, para el tooltip.
function proximo<T extends string>(ciclo: readonly T[], actual: T): T {
  return ciclo[(ciclo.indexOf(actual) + 1) % ciclo.length];
}

function IconoSemana() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

// Una silueta para 1, dos para 2. La cantidad se reconoce por la forma.
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
  cortes,
  activa,
}: {
  etapas: EtapaProxima[];
  // El dd/mm de corte de cada horizonte. Los calcula el servidor, que es quien
  // sabe qué día es hoy en Mendoza; acá solo se elige cuál mostrar.
  cortes: { unaSemana: string; dosSemanas: string };
  // Solo tiene sentido parada en el mes actual: la ventana se cuenta desde
  // HOY, así que mirándola desde un mes anterior mostraría cosas que arrancan
  // después del mes que se está viendo. Ver el comentario de standby abajo.
  activa: boolean;
}) {
  const personas = useCiclo(PERSONAS);
  // Una semana por defecto: lo que arranca en los próximos siete días es lo
  // que todavía se puede mover. Dos es el panorama, a un clic.
  const semanas = useCiclo(SEMANAS);

  const filtro = personas.valor;
  const dias = Number(semanas.valor) * DIAS_POR_SEMANA;
  const hasta = semanas.valor === "1" ? cortes.unaSemana : cortes.dosSemanas;
  const enHorizonte = etapas.filter((e) => e.diasRestantes <= dias);
  const visibles =
    filtro === "todas"
      ? enHorizonte
      : enHorizonte.filter((e) => String(e.personas) === filtro);

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
          <h2 className="text-base font-semibold text-white">Próximas etapas</h2>
          {/* La fecha de corte no se muestra en standby: es exactamente la
              mezcla de tiempos que se quiere evitar (un corte futuro al pie de
              un mes pasado). */}
          {activa && <span className="text-xs text-dc-muted">hasta {hasta}</span>}
          <InfoButton>
            Tareas sin iniciar que arrancan en los próximos {dias} días,
            contados desde hoy, y el botón de semanas cambia ese horizonte.
            Por eso solo está activa en el mes actual:
            en un mes anterior queda en standby. El filtro de proyectos sí la
            modifica.
          </InfoButton>
        </div>

        {/* Los dos controles de la card, con la misma forma: qué ventana de
            tiempo se mira y qué tareas de esa ventana. Antes el horizonte era
            un botón que alternaba, y un botón así no dice cuáles son los
            estados posibles ni en cuál está: el "2" se leía igual como "estoy
            en dos semanas" que como "tocá para ir a dos". */}
        <div className="flex flex-wrap items-center gap-2">
          <BotonCiclico
            ariaLabel={`Horizonte: ${ROTULO_SEMANAS[semanas.valor]}`}
            contenido={
              <>
                <IconoSemana />
                {ROTULO_SEMANAS[semanas.valor]}
              </>
            }
            proximo={ROTULO_SEMANAS[proximo(SEMANAS, semanas.valor)]}
            onSiguiente={semanas.siguiente}
            deshabilitado={!activa}
            tooltipDeshabilitado="Disponible en el mes actual"
          />
          <BotonCiclico
            ariaLabel={`Personas por tarea: ${ROTULO_PERSONAS[filtro]}`}
            contenido={
              <>
                <IconoPersonas dos={filtro === "2"} />
                {ROTULO_PERSONAS[filtro]}
              </>
            }
            proximo={ROTULO_PERSONAS[proximo(PERSONAS, filtro)]}
            onSiguiente={personas.siguiente}
            deshabilitado={!activa}
            tooltipDeshabilitado="Disponible en el mes actual"
          />
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
          {enHorizonte.length === 0
            ? `No hay etapas que arranquen en los próximos ${dias} días.`
            : "Ninguna coincide con este filtro."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto overflow-x-hidden">
          {visibles.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/proyectos/${e.clienteId}/follow-up?lista=${e.listaId}&tarea=${e.id}`}
                      className={`${LINK_FILA} flex items-center justify-between gap-3 px-1 py-2 text-sm`}
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
