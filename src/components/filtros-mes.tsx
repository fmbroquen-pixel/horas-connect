"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_ICON_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { dentroDeUnPopover } from "@/components/ui/popover-flotante";
import { MESES_LARGOS, esFuturo, mesAnterior, mesSiguiente } from "@/lib/mes";

export type OpcionFiltro = { id: string; nombre: string };

// El filtro de las tres pantallas de carga: Home CORE, Time Tracking y
// Expenses.
//
// A la vista queda solo el mes y un botón de más opciones. Todo lo demás
// —los proyectos, y lo que venga— vive adentro. Antes cada pantalla mostraba
// una pastilla del tipo "Filtros activos → 26/05/2026 – 24/08/2026 · Todos los
// proyectos", que ocupaba media barra para decir, casi siempre, que no había
// ningún filtro puesto.
//
// Cuando SÍ hay algo filtrado aparece un contador chico al lado del mes. La
// ausencia de contador ya significa "todos": no hace falta escribirlo.
export function FiltrosMes({
  anio,
  mes,
  basePath,
  opciones,
  seleccionados,
  extra,
  navegar: navegarExterno,
  cargando = false,
  etiqueta = "Proyectos",
}: {
  anio: number;
  mes: number;
  basePath: string;
  opciones: OpcionFiltro[];
  seleccionados: string[];
  // Parámetros de la URL que este filtro no maneja y hay que conservar (el
  // usuario para el que un admin está cargando, por ejemplo).
  extra?: Record<string, string | undefined>;
  // Cómo navegar. El Home pasa el suyo para que las cards se atenúen mientras
  // recalcula; sin esto se usa un push propio dentro de una transición, que al
  // menos evita el parpadeo en blanco.
  navegar?: (url: string) => void;
  cargando?: boolean;
  etiqueta?: string;
}) {
  const router = useRouter();
  const [propioPendiente, start] = useTransition();
  const navegar = navegarExterno ?? ((url: string) => start(() => router.push(url)));
  const pendiente = cargando || propioPendiente;

  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const ref = useRef<HTMLDivElement>(null);

  const url = (m: { anio: number; mes: number }, ids: Set<string>) => {
    const params = new URLSearchParams();
    params.set("anio", String(m.anio));
    params.set("mes", String(m.mes));
    // Tener todo seleccionado es el default y no viaja en la URL: así el
    // enlace queda limpio y "sin parámetro" significa siempre lo mismo.
    if (ids.size > 0 && ids.size < opciones.length) {
      params.set("proyectos", [...ids].join(","));
    }
    for (const [k, v] of Object.entries(extra ?? {})) if (v) params.set(k, v);
    return `${basePath}?${params.toString()}`;
  };

  const aplicar = (ids: Set<string> = sel) => navegar(url({ anio, mes }, ids));

  // Cerrar el panel confirma: no hay botón Aplicar.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (dentroDeUnPopover(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        aplicar();
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
    // Sin array de dependencias: el efecto necesita el `aplicar` de este
    // render, con la selección actual.
  });

  const alternar = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const todos = opciones.length > 0 && sel.size === opciones.length;
  // Solo se cuenta cuando la selección es PARCIAL: "todos" y "ninguno" no son
  // un filtro que valga la pena anunciar.
  const filtrando =
    seleccionados.length > 0 && seleccionados.length < opciones.length;

  const prev = mesAnterior({ anio, mes });
  const next = mesSiguiente({ anio, mes });
  const hayFuturo = esFuturo(next);

  return (
    <div className="flex items-center gap-2" ref={ref}>
      {/* El mes navega con botones y no con enlaces: así el cambio pasa por el
          mismo `navegar` que el resto del filtro y la pantalla puede avisar
          que está recalculando. La URL igual queda actualizada y compartible. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navegar(url(prev, sel))}
          disabled={pendiente}
          title="Mes anterior"
          aria-label="Mes anterior"
          className={`${BTN_SECONDARY_SM} disabled:opacity-50`}
        >
          ←
        </button>
        <span className="min-w-36 text-center font-display text-sm uppercase text-white">
          {MESES_LARGOS[mes - 1]} {anio}
        </span>
        <button
          type="button"
          onClick={() => navegar(url(next, sel))}
          disabled={pendiente || hayFuturo}
          title={hayFuturo ? "No hay meses posteriores al actual" : "Mes siguiente"}
          aria-label="Mes siguiente"
          className={`${BTN_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          →
        </button>
      </div>

      {/* Indicador compacto: ícono y número, nada más. Si no hay filtro
          parcial no se dibuja, y esa ausencia es la que dice "todos". */}
      {filtrando && (
        <span
          title={`${seleccionados.length} de ${opciones.length}`}
          className="flex items-center gap-1 rounded-full bg-dc-peri/15 px-2 py-1 text-xs tabular-nums text-dc-peri"
        >
          <IconoProyecto />
          {seleccionados.length}
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (abierto) {
              aplicar();
              setAbierto(false);
            } else {
              // Al abrir se parte de lo que está aplicado, no de lo que quedó
              // de una edición anterior que no se confirmó.
              setSel(new Set(seleccionados));
              setAbierto(true);
            }
          }}
          title="Más filtros"
          aria-label="Más filtros"
          aria-expanded={abierto}
          className={BTN_ICON_SM}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
          </svg>
        </button>

        {abierto && (
          <div className="dc-menu dc-pop-in absolute right-0 z-40 mt-2 w-64 rounded-xl border border-dc-line bg-dc-deep p-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-dc-muted">
                {etiqueta}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSel(new Set(opciones.map((o) => o.id)))}
                  disabled={todos}
                  className={`${BTN_SECONDARY_SM} disabled:opacity-40`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSel(new Set())}
                  disabled={sel.size === 0}
                  className={`${BTN_SECONDARY_SM} disabled:opacity-40`}
                >
                  Limpiar
                </button>
              </span>
            </div>

            {/* Filas que se prenden y apagan con un clic. Sin checkbox: el
                estado se lee del fondo y del borde, que no ocupan ancho extra
                y se ven de un vistazo en una lista larga. */}
            <div className="max-h-56 space-y-1 overflow-y-auto overflow-x-hidden">
              {opciones.map((o) => {
                const activo = sel.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => alternar(o.id)}
                    aria-pressed={activo}
                    title={o.nombre}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                      activo
                        ? "border-dc-peri/60 bg-dc-peri/15 text-dc-text"
                        : "border-transparent text-dc-muted hover:bg-dc-line/40 hover:text-dc-text"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.nombre}</span>
                    {activo && <IconoCheck />}
                  </button>
                );
              })}
              {opciones.length === 0 && (
                <p className="px-1 py-2 text-xs text-dc-muted">
                  No tenés proyectos asignados.
                </p>
              )}
            </div>

            <p className="mt-2 text-[11px] text-dc-muted">
              {pendiente ? "Actualizando…" : "Se aplica al cerrar"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function IconoProyecto() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h6l2 2h10v10H3z" />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-dc-peri">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
