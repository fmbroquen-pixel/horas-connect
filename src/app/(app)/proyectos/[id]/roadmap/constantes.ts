// Constantes compartidas del Roadmap. Módulo plano (sin "use client") para
// que el encabezado de la tabla, que vive en un Server Component, reciba el
// string de la grilla y no una referencia de cliente.

export const ETIQUETA_ESTADO: Record<string, string> = {
  sin_iniciar: "Sin iniciar",
  en_curso: "En curso",
  no_ejecutada: "No ejecutada",
  finalizada: "Finalizada",
};

// Fuera de la paleta dc-* (que no tiene verde/rojo puros), igual que el
// semáforo de Seguimiento.
export const COLOR_ESTADO: Record<string, string> = {
  sin_iniciar: "#a5a3d6",
  en_curso: "#8b8cff",
  no_ejecutada: "#f87171",
  finalizada: "#34d399",
};

export const OPCIONES_ESTADO = Object.entries(ETIQUETA_ESTADO).map(
  ([value, label]) => ({ value, label }),
);

// (checkbox) · Tarea · Inicio · Fin · Horas est. · Estado · (acciones)
// La duración no tiene columna: se deriva de Inicio y Fin y se guarda sola.
export const GRID_ROADMAP =
  "grid min-w-[840px] grid-cols-[34px_minmax(200px,1fr)_120px_120px_110px_150px_80px] items-center gap-2";

export type TareaRoadmapFila = {
  id: string;
  nombre: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  horasEstimadas: string; // hs:min
  estado: string;
};

// Avance y estado de una lista. Ninguno de los dos se edita a mano: son
// siempre una lectura de las tareas, así que cualquier cambio en ellas los
// actualiza solo.
//
// Una tarea está "resuelta" cuando ya no queda trabajo por hacer, y eso
// incluye las No ejecutadas: se decidió no hacerlas, así que no pueden dejar
// una lista trabada en 90% para siempre.
export function progresoLista(tareas: { estado: string }[]): {
  porcentaje: number;
  estado: string;
  resueltas: number;
  total: number;
} {
  const total = tareas.length;
  const resueltas = tareas.filter(
    (t) => t.estado === "finalizada" || t.estado === "no_ejecutada",
  ).length;

  // Una lista vacía se considera sin iniciar: no hay nada resuelto todavía.
  const estado =
    total === 0 || tareas.every((t) => t.estado === "sin_iniciar")
      ? "sin_iniciar"
      : resueltas === total
        ? "finalizada"
        : "en_curso";

  return {
    porcentaje: total > 0 ? Math.round((resueltas / total) * 100) : 0,
    estado,
    resueltas,
    total,
  };
}

export type ListaRoadmapVista = {
  id: string;
  nombre: string;
  tareas: TareaRoadmapFila[];
  horasEstimadas: number;
  horasEntregadas: number;
};
