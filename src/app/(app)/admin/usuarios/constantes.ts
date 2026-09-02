// Constantes compartidas por la acción (servidor) y el formulario (cliente).
// Módulo plano: un archivo "use server" solo puede exportar funciones async,
// así que las constantes no pueden vivir en actions.ts.

// Un proyecto tiene un único Mentor Owner y hasta esta cantidad de Backups.
//
// Es un tope del producto, no de la base: la base solo garantiza el owner
// único. Cambiar este número alcanza -la validación del servidor, el cupo que
// muestra el formulario y los textos de ayuda salen todos de acá- y no
// requiere migración ni toca las asignaciones ya cargadas.
export const MAX_BACKUPS = 5;

export type RolAsignacion = "owner" | "backup";

// Estado de cada proyecto para las solapas de asignación: quién lo ocupa hoy
// en cada rol, sin contar al usuario que se está editando.
export type ProyectoAsignable = {
  id: string;
  nombre: string;
  // Rol del usuario que se edita en este proyecto ("" si no tiene ninguno).
  rolPropio: "" | RolAsignacion;
  // Asignado sin rol declarado (anterior a esta función): conserva el
  // permiso de carga y espera que el admin le elija una solapa.
  sinRol: boolean;
  ownerAjeno: string | null;
  backupsAjenos: string[];
};
