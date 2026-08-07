// El catálogo de Etapas se retiró de la app: la columna etapa_id del modelo
// queda como referencia histórica de los viáticos ya cargados, pero no se lee
// ni se escribe más. El concepto del viático (combustible, alojamiento…) es
// propio de este módulo y no tiene nada que ver con el de Time Tracking.
export type OpcionSelect = { id: string; nombre: string };

export type ViaticoFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  clienteId: string;
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

// Orden: Fecha · Cliente · Concepto · Moneda · Monto · Archivo · (acciones)
export const GRID_VIATICOS =
  "grid min-w-[780px] grid-cols-[115px_minmax(150px,1fr)_140px_85px_110px_90px_130px] items-center gap-2";
