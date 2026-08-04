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

// Las constantes del cronograma (Gantt) se retiraron junto con la sección.
// El plan de trabajo vive en la pestaña Roadmap, con sus propias constantes
// en proyectos/[id]/roadmap/constantes.ts.
