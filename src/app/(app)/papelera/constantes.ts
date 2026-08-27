// Retención antes del borrado automático definitivo de la papelera.
// Vive fuera de actions.ts porque un módulo "use server" solo puede exportar
// funciones async (no constantes).
export const RETENCION_DIAS = 30;

// Cuántos días sobrevive un dato dentro de un backup del proveedor DESPUÉS de
// que la purga lo borró de la base.
//
// La política es "a los 30 días no queda en ningún lado", y con backups eso es
// imposible de cumplir literalmente: el último backup que contiene el registro
// se toma el día anterior a la purga, así que el borrado real recién se
// completa en RETENCION_DIAS + RETENCION_BACKUP_DIAS. Lo que sí se garantiza es
// que ese plazo esté acotado y que un restore no reviva lo borrado: el registro
// vuelve con su `eliminadoEn` original y el cron de esa misma noche lo elimina
// otra vez, sin que nadie tenga que acordarse.
//
// Supabase Free no hace backups del proyecto, así que hoy es 0 y el borrado se
// completa exactamente a los 30 días. Al pasar a Pro son 7 y hay que ponerlo
// acá: el número no se usa para calcular nada, se declara para que el plazo
// real quede escrito donde se lo va a buscar y no en la cabeza de alguien.
export const RETENCION_BACKUP_DIAS = 0;

// El plazo que se le puede prometer a alguien: cuándo el dato dejó de existir
// en todas las copias.
export const HORIZONTE_BORRADO_DIAS = RETENCION_DIAS + RETENCION_BACKUP_DIAS;
