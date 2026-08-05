// Tipos serializables compartidos entre la página (server) y las filas (client).

export type OpcionSelect = { id: string; nombre: string };

// Catálogo de categorías de tarea (lista — tarea). Es global: clasifica el
// TIPO de actividad, así que no depende del cliente elegido.
export type OpcionCategoria = OpcionSelect;

// Tarifas vigentes del usuario, clave "modalidad-ownership" → USD/hora.
// Se usa para mostrar en vivo el USD/hora y el total mientras se carga.
export type MapaTarifas = Record<string, number>;

export type RegistroFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  clienteId: string;
  // Categoría de la actividad. Los registros anteriores al catálogo llegan
  // con categoriaId vacío y con la etiqueta de su clasificación anterior en
  // categoriaNombre, para que el historial se siga leyendo.
  categoriaId: string;
  categoriaNombre: string;
  ownership: "owner" | "backup";
  modalidad: "presencial" | "virtual";
  horas: string; // hs:min
  tarifaUsd: number;
  montoUsd: number;
  editable: boolean;
};

export const ETIQUETA_OWNERSHIP: Record<string, string> = {
  owner: "Owner",
  backup: "Backup",
};

export const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
};
