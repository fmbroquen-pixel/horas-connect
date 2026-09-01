"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_ICON_SM, BTN_SECONDARY_SM } from "@/lib/ui";
import { dentroDeUnPopover } from "@/components/ui/popover-flotante";
import { MESES_LARGOS, esFuturo, mesAnterior, mesSiguiente } from "@/lib/mes";
import { urlFiltroMes } from "@/lib/url-filtro";
import { ListaProyectos, type OpcionFiltro } from "@/components/lista-proyectos";
import { IconoProyecto } from "@/components/ui/icono-proyecto";

export type { OpcionFiltro };

// Cuánto tarda el indicador en irse. Corto a propósito: es el acuse de recibo
// del clic, no una animación para mirar.
const MS_SALIDA = 150;

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
  // El indicador se va apenas se lo toca, sin esperar a que vuelva el servidor.
  // Son dos etapas: `saliendo` lo desvanece y colapsa su ancho, y `oculto` lo
  // desmonta cuando terminó. La segunda hace falta porque la primera no libera
  // el lugar: con opacity el hueco quedaba abierto hasta que llegaban los datos
  // nuevos, que es justo lo que se venía a sacar.
  //
  // El desmontaje va por setTimeout y no por transitionend ni por
  // requestAnimationFrame: en una pestaña de fondo esos dos no corren, y el
  // indicador quedaría invisible pero ocupando lugar hasta que alguien mire.
  //
  // El ancho no se anima. Se probaron las dos formas de hacerlo -una grilla de
  // 1fr a 0fr y un max-width que se cierra- y ninguna colapsa: como el
  // indicador es un item de un flex, su ancho lo sigue midiendo el contenido.
  // Medido en el navegador, a los 60ms de tocarlo la barra seguía igual de
  // ancha en las dos. El desmontaje sí libera el lugar, y con el fade delante
  // el salto queda tapado.
  const [saliendo, setSaliendo] = useState(false);
  const [oculto, setOculto] = useState(false);
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

  // El mismo reset que el botón "Limpiar" del submenú de proyectos: vaciar la
  // selección. Sin ids, el parámetro no viaja en la URL y la pantalla vuelve a
  // mostrarlos todos, que es como se escribe "sin filtro".
  //
  // También se sincroniza la selección local. Si no, quedaba la vieja y bastaba
  // con abrir el menú y cerrarlo -que confirma sin botón Aplicar- para que el
  // filtro recién limpiado volviera solo.
  const limpiar = () => {
    setSaliendo(true);
    setTimeout(() => setOculto(true), MS_SALIDA);
    // La navegación sale en el mismo gesto, no después de la animación: el
    // header se reacomoda mientras los datos viajan, y cada bloque muestra su
    // propio spinner por su cuenta.
    setSel(new Set());
    aplicar(new Set());
  };

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

  // Si vuelve un filtro distinto -otro mes, otra selección- el indicador tiene
  // que estar visible de nuevo. Se sincroniza en el render y no desde un
  // efecto, que dibujaría la pantalla dos veces. Sin esto, una navegación que
  // no llegara a limpiar dejaba el indicador invisible pero presente.
  const [filtroPrevio, setFiltroPrevio] = useState(seleccionados.join());
  if (seleccionados.join() !== filtroPrevio) {
    setFiltroPrevio(seleccionados.join());
    setSaliendo(false);
    setOculto(false);
  }

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
          data-tooltip="Mes anterior"
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
          data-tooltip={hayFuturo ? "No hay meses posteriores al actual" : "Mes siguiente"}
          aria-label="Mes siguiente"
          className={`${BTN_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          →
        </button>
      </div>

      {/* Indicador compacto: ícono y número, nada más. Si no hay filtro
          parcial no se dibuja, y esa ausencia es la que dice "todos".
          Además es el atajo para sacarlo. Es el único elemento en pantalla que
          existe PORQUE hay un filtro puesto, así que es donde se va a buscar
          cómo sacarlo; obligar a volver al menú ⋮, abrirlo, marcar las que
          faltan y cerrarlo eran cuatro gestos para deshacer uno.
          Sin cruz ni nada agregado: la carpeta y el número siguen siendo un
          dato, y lo que hace el clic se descubre al usarlo una vez. Agregarle
          iconografía lo convertía en un botón de cerrar y le quitaba lo que
          venía a decir. La acción sí se anuncia por aria-label, que es donde un
          lector de pantalla la necesita. */}
      {filtrando && !oculto && (
        <button
          type="button"
          onClick={limpiar}
          disabled={pendiente}
          data-tooltip={`${seleccionados.length} de ${opciones.length} proyectos`}
          aria-label={`Filtrando ${seleccionados.length} de ${opciones.length} proyectos. Quitar el filtro.`}
          className={`flex items-center gap-1 whitespace-nowrap rounded-full bg-dc-peri/15 px-2 py-1 text-xs tabular-nums text-dc-peri transition duration-150 hover:bg-dc-peri/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40 ${
            saliendo
              ? "pointer-events-none scale-90 opacity-0"
              : "opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          <IconoProyecto size={13} strokeWidth={2} />
          {seleccionados.length}
        </button>
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
          data-tooltip="Más filtros"
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
