export type OpcionSelect = { id: string; nombre: string };

export type ViaticoFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  clienteId: string;
  etapaId: string;
  moneda: "USD" | "ARS";
  monto: number;
  concepto: string;
  archivoUrl: string | null;
};

export const ETIQUETA_CONCEPTO: Record<string, string> = {
  combustible: "Combustible",
  alojamiento: "Alojamiento",
  traslado: "Traslado",
  almuerzo: "Almuerzo",
  otros: "Otros",
};

export const GRID_VIATICOS =
  "grid min-w-[860px] grid-cols-[115px_minmax(130px,1fr)_minmax(130px,1fr)_85px_110px_130px_110px_130px] items-center gap-2";
