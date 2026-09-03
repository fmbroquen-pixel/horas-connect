// Las columnas de Time Tracking. El tipo, la regla de anchos y el porqué de
// todo esto viven en components/data-table/columnas: acá solo la lista.
import type { Columna } from "@/components/data-table/columnas";

export type ColumnaId =
  | "seleccion"
  | "fecha"
  | "usuario"
  | "cliente"
  | "concepto"
  | "ownership"
  | "horas"
  | "modalidad"
  | "usdHora"
  | "usdTotal"
  | "acciones";

export const COLUMNAS_TIMETRACKER: Columna<ColumnaId>[] = [
  { id: "seleccion", etiqueta: "", ancho: "34px" },
  { id: "fecha", etiqueta: "Fecha", ancho: "92px" },
  { id: "usuario", etiqueta: "Usuario", ancho: "minmax(0,1fr)" },
  { id: "cliente", etiqueta: "Cliente", ancho: "minmax(0,1.1fr)" },
  { id: "concepto", etiqueta: "Concepto", ancho: "minmax(0,1.1fr)" },
  // Los anchos fijos los fija el RÓTULO, no el dato: en el encabezado van en
  // mayúscula y semibold, así que "Ownership" mide más que "Presencial".
  // Medido en el navegador: con 84px el encabezado mostraba "OWNERSH…".
  { id: "ownership", etiqueta: "Ownership", ancho: "96px" },
  { id: "horas", etiqueta: "Horas", ancho: "58px" },
  { id: "modalidad", etiqueta: "Modalidad", ancho: "96px" },
  { id: "usdHora", etiqueta: "USD/hora", ancho: "86px" },
  { id: "usdTotal", etiqueta: "USD total", ancho: "88px" },
  { id: "acciones", etiqueta: "", ancho: "76px" },
];

