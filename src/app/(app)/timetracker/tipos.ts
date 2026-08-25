// Tipos serializables compartidos entre la página (server) y las filas (client).

export type OpcionSelect = { id: string; nombre: string };

// Catálogo de conceptos. Es global y curado desde Settings: clasifica en qué
// se consumieron las horas, así que no depende del cliente elegido.
export type OpcionConcepto = OpcionSelect;

// Tarifas vigentes del usuario, clave "modalidad-ownership" → USD/hora.
// Se usa para mostrar en vivo el USD/hora y el total mientras se carga.
export type MapaTarifas = Record<string, number>;

export type RegistroFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  clienteId: string;
  // Concepto de la actividad. Los registros anteriores al catálogo llegan con
  // conceptoId vacío y con la etiqueta de su clasificación anterior en
  // conceptoNombre, para que el historial se siga leyendo.
  conceptoId: string;
  conceptoNombre: string;
  ownership: "owner" | "backup";
  modalidad: "presencial" | "virtual";
  horas: string; // hs:min
  tarifaUsd: number;
  montoUsd: number;
  // "Editado por X el dd/mm/aaaa", o null si nunca se editó.
  edicion: string | null;
};

export const ETIQUETA_OWNERSHIP: Record<string, string> = {
  owner: "Owner",
  backup: "Backup",
};

export const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
};
