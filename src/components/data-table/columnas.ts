// La definición de columnas de una data table.
//
// Una data table es una tabla de REGISTRO DE DATOS: filas homogéneas que se
// listan, se filtran, se seleccionan y se corrigen de a una. Hoy son dos, Time
// Tracking y Expenses, y comparten patrón a propósito.
//
// Follow Up NO es una data table y no usa nada de esta carpeta: es gestión de
// un plan —listas, secuencia, dependencias de fechas, drag & drop, progreso— y
// sus filas no son registros intercambiables sino pasos de un proceso. Un
// cambio acá no le llega, y eso es deliberado.
//
// Esta lista existe porque el encabezado y las filas se escribían a mano por
// separado, y nada las ataba: al agregar una columna a Time Tracking el
// encabezado la puso en un lugar y la fila en otro, y la tabla mostró el
// usuario bajo el rótulo "Fecha". Los dos archivos eran válidos por separado,
// así que ninguna herramienta lo podía ver.

import type { Alineacion } from "@/components/campos/alineacion";

export type Columna<Id extends string> = {
  id: Id;
  // Vacío = sin rótulo (la columna de selección y la de acciones).
  etiqueta: string;
  // Valor de grid-template-columns.
  //
  // Fijo para lo que tiene largo conocido —una fecha, un monto, dos íconos— y
  // minmax(0, Nfr) para el texto libre. minmax(0,…) y no `Nfr` a secas: el
  // mínimo automático de una pista de grilla es el ancho de su contenido, así
  // que con `1fr` un nombre largo ensancha la tabla y aparece scroll
  // horizontal. Con mínimo 0, la columna cede y el texto recorta con ellipsis.
  //
  // Los anchos fijos los decide el RÓTULO y no el dato: en el encabezado van
  // en mayúscula y semibold, así que "Ownership" mide más que "Presencial".
  ancho: string;
  // Cómo se alinea la columna, rótulo y dato por igual. Por defecto centrado,
  // que es lo que ya hacía el encabezado (.dc-thead los centra) y lo que la
  // tabla usa para todo: texto, números, íconos y el checkbox.
  //
  // Está acá y no en cada celda porque antes se decidía dos veces —el rótulo
  // por CSS y el dato en el JSX de la fila— y tres columnas terminaron con el
  // título centrado sobre un dato alineado a la izquierda. Declarada una vez,
  // el encabezado y la celda no pueden discrepar.
  alineacion?: Alineacion;
};

// Las clases van aparte del ancho porque Tailwind no puede compilar una clase
// armada en tiempo de ejecución: un `grid-cols-[...]` interpolado no existiría
// en el CSS. El ancho viaja por style.
export const GRID_DATA_TABLE = "grid items-center gap-2";

export function estiloGrid<Id extends string>(columnas: Columna<Id>[]) {
  return { gridTemplateColumns: columnas.map((c) => c.ancho).join(" ") };
}

// La alineación efectiva de una columna. Centrado si no dice otra cosa.
export function alineacionDe<Id extends string>(c: Columna<Id>): Alineacion {
  return c.alineacion ?? "centro";
}
