"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_ICON_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { dentroDeUnPopover } from "@/components/ui/popover-flotante";
import { MESES_LARGOS, esFuturo, mesAnterior, mesSiguiente } from "@/lib/mes";
import { urlFiltroMes } from "@/lib/url-filtro";
import { ListaProyectos, type OpcionFiltro } from "@/components/lista-proyectos";

export type { OpcionFiltro };

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
  conMenu = true,
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
  // Time Tracking y Expenses juntan todo en un único menú de pantalla, así que
  // ahí este componente aporta solo el mes y el indicador. El Home sí trae su
  // propio menú, porque no tiene otro donde meterlo.
  conMenu?: boolean;
}) {
  const router = useRouter();
  const [propioPendiente, start] = useTransition();
  const navegar = navegarExterno ?? ((url: string) => start(() => router.push(url)));
  const pendiente = cargando || propioPendiente;

  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const ref = useRef<HTMLDivElement>(null);

  const url = (m: { anio: number; mes: number }, ids: Set<string>) =>
    urlFiltroMes({
      basePath,
      anio: m.anio,
      mes: m.mes,
      ids: [...ids],
      total: opciones.length,
      extra,
    });

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

      {conMenu && (
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
            <ListaProyectos
              opciones={opciones}
              seleccionados={sel}
              onCambiar={setSel}
            />
          </div>
        )}
      </div>
      )}
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

