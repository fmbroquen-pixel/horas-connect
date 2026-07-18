// Constantes compartidas del módulo Proyectos. Módulo plano (sin
// "use client") para poder importarse desde Server Components y componentes
// de cliente por igual.

export const ETIQUETA_SEMAFORO: Record<string, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
};

// Colores del semáforo sobre fondo oscuro/claro (no forman parte de la
// paleta dc-*, que no tiene verde/amarillo/rojo puros).
export const COLOR_SEMAFORO: Record<string, string> = {
  verde: "#34d399",
  amarillo: "#fbbf24",
  rojo: "#f87171",
};

export const OPCIONES_SEMAFORO = Object.entries(ETIQUETA_SEMAFORO).map(
  ([value, label]) => ({ value, label }),
);

export const ETIQUETA_ESTADO_TAREA: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
};

export const COLOR_ESTADO_TAREA: Record<string, string> = {
  pendiente: "#a5a3d6",
  en_curso: "#8b8cff",
  hecha: "#34d399",
};

export const OPCIONES_ESTADO_TAREA = Object.entries(ETIQUETA_ESTADO_TAREA).map(
  ([value, label]) => ({ value, label }),
);

// Grilla de la tabla editable del Gantt:
// Título · Inicio · Fin · Estado · Responsable · (acciones)
export const GRID_TAREAS =
  "grid min-w-[880px] grid-cols-[minmax(170px,1fr)_115px_115px_130px_minmax(130px,1fr)_130px] items-center gap-2";

export type TareaFila = {
  id: string;
  titulo: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  estado: string;
  responsable: string;
};
