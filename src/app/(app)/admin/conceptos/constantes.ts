// Constantes compartidas de Conceptos.
//
// IMPORTANTE: este archivo NO lleva "use client". El encabezado de la tabla
// vive en un Server Component (page.tsx) y las filas en uno de cliente; si la
// grilla se exportara desde el módulo "use client", el servidor recibiría una
// referencia de cliente en lugar del string y las columnas nunca se
// aplicarían (los headers salen pegados: "NOMBREORDENESTADO"). Es el mismo
// motivo por el que GRID_VACACIONES vive en vacaciones/tipos.ts.

// Nombre se queda con todo el espacio sobrante (1fr) y Orden y Estado van
// angostas y fijas: una guarda un número de uno o dos dígitos y la otra un
// badge, así que darles el mismo ancho que al nombre sería regalar espacio.
// minmax(0,...) en vez de 1fr a secas para que un nombre largo trunque en vez
// de estirar la columna. Los px fijos, además, aguantan mejor el responsive
// que los porcentajes: al angostarse la pantalla lo que cede es Nombre.
export const GRID_CONCEPTOS =
  "grid min-w-[420px] grid-cols-[minmax(0,1fr)_100px_140px] items-center gap-3";

export type ConceptoFila = {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
};
