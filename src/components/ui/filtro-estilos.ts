// El ritmo vertical de un submenú de filtro, en un solo lugar.
//
// Un submenú de filtro son cuatro zonas apiladas en un panel angosto:
//
//   ‹ Volver
//                          ← aire
//   PROYECTOS      ⊞  ⌫
//                          ← aire
//   Andreu Directorio
//   Andreu Gestión
//   …
//                          ← aire
//   ✓
//
// Sin ese aire las tres primeras se leen como un bloque: "Volver" queda
// diagonal a los íconos de acción, a cuatro píxeles, y el ojo los agrupa como
// si fueran la misma barra de herramientas. Son cosas distintas -una sale del
// submenú, las otras dos operan sobre la lista- y el espacio es lo que lo dice.
//
// Está acá y no escrito en cada componente porque el ritmo es una relación
// entre partes que viven en archivos distintos: el título y las acciones en
// ListaProyectos, el botón de confirmar en SubmenuFiltro. Repartido en dos
// lados se desincroniza al primer ajuste, y un filtro nuevo hereda la mitad.

// La fila de título + acciones. El margen de arriba la despega de "Volver"; el
// de abajo, de la primera opción de la lista. `py` le da a los botones de ícono
// su propio alto en vez de dejarlos pegados al texto de arriba y de abajo.
export const FILTRO_CABECERA =
  "mt-2.5 mb-2 flex items-center justify-between gap-3 px-1 py-0.5";

// El título de la lista. Semibold y con más tracking que las opciones: es un
// rótulo de sección, no una opción más, y hasta ahora compartía peso y color
// con las filas que encabeza. Sigue en dc-muted, que es como CORE escribe sus
// micro-rótulos en mayúscula -los KPIs, las cards-: subirlo a texto pleno lo
// habría hecho competir con las opciones seleccionadas.
export const FILTRO_TITULO =
  "text-xs font-semibold uppercase tracking-wider text-dc-muted";

// El botón de confirmar, al pie. Mismo aire que separa a la cabecera de la
// lista, para que el panel tenga un solo ritmo de arriba a abajo.
export const FILTRO_CONFIRMAR = "mt-2";

// La lista de opciones. Es el unico scroll del submenu, y `overscroll-contain`
// corta el encadenamiento: al llegar al final, la rueda deja de empujar la
// pagina de atras. Sin eso, terminar de recorrer una lista larga movia el
// listado que estaba debajo del menu.
export const FILTRO_LISTA =
  "max-h-56 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain";
