// El catálogo de Etapas se retiró de la app: la columna etapa_id del modelo
// queda como referencia histórica de los viáticos ya cargados, pero no se lee
// ni se escribe más. El concepto del viático (combustible, alojamiento…) es
// propio de este módulo y no tiene nada que ver con el de Time Tracking.
export type OpcionSelect = { id: string; nombre: string };

export type ViaticoFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  clienteId: string;
  // Si el cliente sigue activo. Un inactivo no admite carga ni edicion: su
  // historia se mira. Mismo criterio que en Time Tracking.
  clienteActivo: boolean;
  moneda: "USD" | "ARS";
  monto: number;
  concepto: string;
  archivoUrl: string | null;
  // "Editado por X el dd/mm/aaaa", o null si nunca se editó.
  edicion: string | null;
};

export const ETIQUETA_CONCEPTO: Record<string, string> = {
  combustible: "Combustible",
  alojamiento: "Alojamiento",
  traslado: "Traslado",
  almuerzo: "Almuerzo",
  otros: "Otros",
};
