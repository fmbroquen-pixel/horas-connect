// Tipos serializables compartidos entre la página (server) y las filas (client).

export type OpcionSelect = { id: string; nombre: string };

// Tareas del Roadmap disponibles por cliente: el desplegable de Tarea cambia
// según el cliente elegido, porque cada proyecto tiene su propio plan.
export type TareasPorCliente = Record<string, OpcionSelect[]>;

// Tarifas vigentes del usuario, clave "modalidad-ownership" → USD/hora.
// Se usa para mostrar en vivo el USD/hora y el total mientras se carga.
export type MapaTarifas = Record<string, number>;

export type RegistroFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  clienteId: string;
  // Tarea del Roadmap contra la que se imputan las horas. Los registros
  // anteriores al Roadmap no tienen ninguna: llegan con tareaId vacío y con
  // la etiqueta de su etapa vieja en tareaNombre, para que el historial se
  // siga leyendo.
  tareaId: string;
  tareaNombre: string;
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
