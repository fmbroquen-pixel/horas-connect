// Retención antes del borrado automático definitivo de la papelera.
// Vive fuera de actions.ts porque un módulo "use server" solo puede exportar
// funciones async (no constantes).
export const RETENCION_DIAS = 30;
