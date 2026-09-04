"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_SECONDARY_SM } from "@/lib/ui";
import { MESES_LARGOS, esFuturo, mesAnterior, mesSiguiente } from "@/lib/mes";
import { urlFiltroMes, type FiltroUrl } from "@/lib/url-filtro";
import { type OpcionFiltro } from "@/components/lista-proyectos";
import { IndicadorFiltro } from "@/components/indicador-filtro";
import { MenuAcciones } from "@/components/ui/menu-acciones";
import { SubmenuFiltro } from "@/components/submenu-filtro";

export type { OpcionFiltro };

// Un filtro multiselección de la pantalla.
export type FiltroDeMenu = {
  // El nombre del parámetro en la URL: "proyectos", "owners".
  clave: string;
  // Cómo se llama en el menú: "Proyectos", "Mentor Owner".
  nombre: string;
  // En plural y minúscula, para el contador: "3 de 12 proyectos".
  plural: string;
  // Una funcion y no un nodo: el mismo icono se dibuja mas chico en el
  // contador que en el menu, y pasarlo ya construido obligaba a elegir un solo
  // tamano o a mandar dos props.
  icono: (size: number) => React.ReactNode;
  opciones: OpcionFiltro[];
  seleccionados: string[];
};

// La barra de filtros de las pantallas por mes: Home CORE, Analytics, Time
// Tracking y Expenses.
//
// A la vista queda el mes, un contador por filtro puesto y un botón de más
// opciones. Todo lo demás vive adentro del menú.
//
// La lista de filtros es un parámetro y no está escrita acá: agregar uno
// -Mentor Owner fue el segundo- no debería obligar a tocar este componente, ni
// a que cada pantalla arme su propia versión del contador y de la URL.
export function FiltrosMes({
  anio,
  mes,
  basePath,
  filtros,
  extra,
  navegar: navegarExterno,
  cargando = false,
  conMenu = true,
}: {
  anio: number;
  mes: number;
  basePath: string;
  filtros: FiltroDeMenu[];
  // Parámetros de la URL que estos filtros no manejan y hay que conservar (el
  // usuario para el que un admin está cargando, por ejemplo).
  extra?: Record<string, string | undefined>;
  // Cómo navegar. Home y Analytics pasan el suyo para que las cards se atenúen
  // mientras recalcula; sin esto se usa un push propio dentro de una
  // transición, que al menos evita el parpadeo en blanco.
  navegar?: (url: string) => void;
  cargando?: boolean;
  // Time Tracking y Expenses juntan todo en un único menú de pantalla, así que
  // ahí este componente aporta solo el mes y los contadores.
  conMenu?: boolean;
}) {
  const router = useRouter();
  const [propioPendiente, start] = useTransition();
  const navegar = navegarExterno ?? ((url: string) => start(() => router.push(url)));
  const pendiente = cargando || propioPendiente;

  // Cómo viaja cada filtro hoy. Es lo que hace que moverse de mes, o tocar un
  // filtro, no borre a los demás.
  const comoUrl = (f: FiltroDeMenu): FiltroUrl => ({
    clave: f.clave,
    ids: f.seleccionados,
    total: f.opciones.length,
  });

  const url = (m: { anio: number; mes: number }, cambio?: FiltroUrl) =>
    urlFiltroMes({
      basePath,
      anio: m.anio,
      mes: m.mes,
      filtros: filtros.map((f) =>
        cambio && cambio.clave === f.clave ? cambio : comoUrl(f),
      ),
      extra,
    });

  // Limpiar un filtro es mandarlo completo: sin ids parciales el parámetro no
  // viaja y la pantalla vuelve a mostrarlos todos, que es como se escribe "sin
  // filtro". Los otros filtros quedan como estaban.
  const limpiar = (f: FiltroDeMenu) =>
    navegar(url({ anio, mes }, { clave: f.clave, ids: [], total: f.opciones.length }));

  // Un filtro con una sola opción no filtra nada: elegirla es la vista
  // completa y no elegirla también. Se esconde en vez de ofrecer un menú que
  // no hace nada.
  const utiles = filtros.filter((f) => f.opciones.length > 1);

  const prev = mesAnterior({ anio, mes });
  const next = mesSiguiente({ anio, mes });
  const hayFuturo = esFuturo(next);

  return (
    <div className="flex items-center gap-2">
      {/* El mes navega con botones y no con enlaces: así el cambio pasa por el
          mismo `navegar` que el resto del filtro y la pantalla puede avisar
          que está recalculando. La URL igual queda actualizada y compartible. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navegar(url(prev))}
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
          onClick={() => navegar(url(next))}
          disabled={pendiente || hayFuturo}
          data-tooltip={hayFuturo ? "No hay meses posteriores al actual" : "Mes siguiente"}
          aria-label={hayFuturo ? "No hay meses posteriores al actual" : "Mes siguiente"}
          className={`${BTN_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          →
        </button>
      </div>

      {/* Un contador por filtro puesto. Con los dos activos se ven los dos, y
          cada uno se saca por su lado: quien acotó a tres proyectos de un
          mentor puede querer soltar una de las dos cosas, no las dos. */}
      {filtros.map((f) => (
        <IndicadorFiltro
          key={f.clave}
          nombre={f.plural}
          icono={f.icono(13)}
          seleccionados={f.seleccionados.length}
          total={f.opciones.length}
          onLimpiar={() => limpiar(f)}
          deshabilitado={pendiente}
        />
      ))}

      {/* Más ancho que el menú de Time Tracking: el encabezado de la lista
          lleva el nombre del filtro más Todos y Limpiar, y "Mentor Owner" no
          entraba en la misma línea que los dos botones. */}
      {conMenu && utiles.length > 0 && (
        <MenuAcciones ancho="w-64" etiqueta="Más filtros">
          {utiles.map((f) => (
            <SubmenuFiltro
              key={f.clave}
              nombre={f.nombre}
              icono={f.icono(16)}
              clave={f.clave}
              basePath={basePath}
              parametros={{ anio, mes, ...(extra ?? {}) }}
              otros={filtros.filter((o) => o.clave !== f.clave).map(comoUrl)}
              opciones={f.opciones}
              seleccionados={f.seleccionados}
              navegar={navegar}
            />
          ))}
        </MenuAcciones>
      )}
    </div>
  );
}
