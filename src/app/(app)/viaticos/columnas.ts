// Las columnas de Expenses. El tipo, la regla de anchos y el porqué de todo
// esto viven en components/data-table/columnas: acá solo la lista.
import type { Columna } from "@/components/data-table/columnas";

// Sin columna Usuario a propósito: Expenses sigue con el selector global de
// "Registrar viático para", que es otro trabajo. Compartir el patrón de tabla
// no significa compartir el modelo de datos.
export type ColumnaId =
  | "seleccion"
  | "fecha"
  | "cliente"
  | "concepto"
  | "moneda"
  | "monto"
  | "comprobante"
  | "acciones";

export const COLUMNAS_VIATICOS: Columna<ColumnaId>[] = [
  { id: "seleccion", etiqueta: "", ancho: "34px" },
  { id: "fecha", etiqueta: "Fecha", ancho: "92px" },
  { id: "cliente", etiqueta: "Cliente", ancho: "minmax(0,1.4fr)" },
  { id: "concepto", etiqueta: "Concepto", ancho: "minmax(0,1fr)" },
  { id: "moneda", etiqueta: "Moneda", ancho: "86px" },
  { id: "monto", etiqueta: "Monto", ancho: "104px" },
  { id: "comprobante", etiqueta: "Compr.", ancho: "72px" },
  { id: "acciones", etiqueta: "", ancho: "76px" },
];
