// Constantes compartidas de Conceptos.
//
// IMPORTANTE: este archivo NO lleva "use client". El encabezado de la tabla
// vive en un Server Component (page.tsx) y las filas en uno de cliente; si la
// grilla se exportara desde el módulo "use client", el servidor recibiría una
// referencia de cliente en lugar del string y las columnas nunca se
// aplicarían (los headers salen pegados: "NOMBREORDENESTADO"). Es el mismo
// motivo por el que GRID_VACACIONES vive en vacaciones/tipos.ts.

// Anchos fijos para Orden y Estado, y el resto para Nombre: así las tres
// columnas caen siempre en el mismo lugar y el gap generoso evita que los
// textos se lean pegados.
export const GRID_CONCEPTOS =
  "grid min-w-[560px] grid-cols-[minmax(240px,1fr)_120px_160px] items-center gap-6";

export type ConceptoFila = {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
};
