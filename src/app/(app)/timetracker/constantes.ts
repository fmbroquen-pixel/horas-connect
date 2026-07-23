import { DIAS_VENTANA_CARGA } from "@/lib/ventana-carga";

// Ventana de carga/edición de horas: cuántos días hacia atrás (desde hoy) se
// pueden cargar o modificar registros. Vive fuera de actions.ts porque un
// módulo "use server" solo puede exportar funciones async (no constantes), y
// la usan también la página y los componentes de cliente (DatePicker).
export const DIAS_VENTANA_EDICION = DIAS_VENTANA_CARGA;
