// Las medidas compartidas de las cards de KPI.
//
// En un archivo SIN "use client" a propósito. Las tres pantallas que tienen
// KPIs son Server Components, y una constante exportada desde un módulo de
// cliente no les llega como texto: Next se la entrega como una referencia al
// cliente, y al interpolarla en un template literal termina escrita en el
// atributo `class` la fuente de una función que lanza un error. Medido: el
// rótulo del Semáforo salió con `class="function() { throw new Error(...) }"`
// y sin una sola de sus clases aplicadas.
//
// Viviendo acá, la importan tanto el componente de cliente como las páginas.

// La fila de KPIs de una pantalla. Está acá para que Home y Analytics no la
// escriban cada una: son el mismo objeto y tienen que romperse igual.
export const GRID_KPIS = "grid grid-cols-2 gap-3 lg:grid-cols-4";

// El rótulo de una card de KPI, en cualquiera de las tres pantallas que las
// tienen: Home CORE, Analytics y el Home de un proyecto.
//
// Es lo único que esas tres comparten de verdad. La card del proyecto no es
// una copia de la compartida: además de cifras muestra nombres -otra
// tipografía, otro tamaño, con ellipsis y un contador "+N"- y por eso sigue
// siendo suya. Pero el rótulo sí es el mismo objeto, y venía con dos tracking
// distintos y dos formas de reservar el alto.
//
// Reserva dos líneas aunque el texto ocupe una: sin eso, "Cobrado" dejaba su
// valor una línea más arriba que "Hs estimadas entregadas" y los números de
// una misma fila no arrancaban a la misma altura. Es un MÍNIMO y no un alto
// fijo: un rótulo que llegue a tres líneas crece en vez de desbordarse sobre
// el número.
export const KPI_ROTULO =
  "flex min-h-8 items-start gap-1.5 text-[11px] uppercase leading-tight tracking-wide text-dc-muted";
