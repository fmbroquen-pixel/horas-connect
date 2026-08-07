import { DIAS_VENTANA_CARGA } from "@/lib/ventana-carga";
import { DIA_MS, hoyUTC } from "@/lib/dias-habiles";

// Ventana de carga/edición de horas: cuántos días hacia atrás (desde hoy) se
// pueden cargar o modificar registros. Vive fuera de actions.ts porque un
// módulo "use server" solo puede exportar funciones async (no constantes), y
// la usan también la página y los componentes de cliente (DatePicker).
export const DIAS_VENTANA_EDICION = DIAS_VENTANA_CARGA;

// Fecha más antigua que se puede cargar o modificar. Vive acá, y no en la
// action, porque la usan los dos lados: el servidor para rechazar y la tabla
// para decidir qué fila es editable. Calculado por separado, la tabla podría
// ofrecer editar una fila que la action después rechaza.
//
// En UTC, como la columna @db.Date y como el resto del sistema.
export function limiteVentana(): Date {
  return new Date(hoyUTC().getTime() - DIAS_VENTANA_EDICION * DIA_MS);
}
