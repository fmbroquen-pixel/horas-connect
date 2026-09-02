// Tipos serializables compartidos entre la página (server) y las filas (client).

import type { TarifaVigencia } from "@/lib/tarifas";

export type OpcionSelect = { id: string; nombre: string };

// Catálogo de conceptos. Es global y curado desde Settings: clasifica en qué
// se consumieron las horas, así que no depende del cliente elegido.
export type OpcionConcepto = OpcionSelect;

// Historial de tarifas del usuario, clave "modalidad-ownership".
//
// Es el historial completo y no solo lo vigente porque el monto se calcula con
// la tarifa de la FECHA DEL REGISTRO: si se carga algo con fecha retroactiva,
// el total que se muestra mientras se escribe tiene que ser el mismo que va a
// guardar el servidor.
export type MapaTarifas = Record<string, TarifaVigencia[]>;

export type RegistroFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  // Dueño de las horas (worked_by). Se muestra y no se edita: el monto es una
  // foto de LA TARIFA DE ESE USUARIO en esa fecha, así que cambiar el dueño no
  // es mover una etiqueta, es revaluar el registro. Para corregir a quién se
  // le cargó, se borra y se vuelve a cargar.
  usuarioNombre: string;
  // Si el dueño sigue habilitado. Un usuario bloqueado conserva su historia a
  // la vista -son horas que se trabajaron y se facturaron- pero congelada:
  // misma regla que un cliente inactivo, aplicada a la otra dimensión del
  // registro.
  usuarioActivo: boolean;
  clienteId: string;
  // Si el cliente sigue activo. Un inactivo no admite carga ni edicion: su
  // historia se mira. La fila lo necesita para no ofrecer una edicion que el
  // servidor va a rechazar igual.
  clienteActivo: boolean;
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
