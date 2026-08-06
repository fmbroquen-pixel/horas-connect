// Constantes compartidas del Roadmap. Módulo plano (sin "use client") para
// que el encabezado de la tabla, que vive en un Server Component, reciba el
// string de la grilla y no una referencia de cliente.

// La clave `finalizada` es el valor del enum en la base y no se toca: cambiar
// solo la etiqueta deja intactos todos los registros ya cargados.
export const ETIQUETA_ESTADO: Record<string, string> = {
  sin_iniciar: "Sin iniciar",
  en_curso: "En curso",
  no_ejecutada: "No ejecutada",
  finalizada: "Finalizado",
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

// (checkbox) · Tarea (+ personas) · Inicio · Fin · Horas est. · Estado · (acciones)
// La duración no tiene columna: se deriva de Inicio y Fin y se guarda sola.
export const GRID_ROADMAP =
  "grid min-w-[880px] grid-cols-[34px_minmax(220px,1fr)_120px_120px_110px_150px_80px] items-center gap-2";

export type TareaRoadmapFila = {
  id: string;
  nombre: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  horasEstimadas: string; // hs:min
  estado: string;
  personas: number; // 1 o 2 mentores
};

// Avance y estado de una lista. Ninguno de los dos se edita a mano: son
// siempre una lectura de las tareas, así que cualquier cambio en ellas los
// actualiza solo.
//
// Son dos preguntas distintas y por eso no usan el mismo criterio:
//
// · El PORCENTAJE mide cuánto se movió la lista: toda tarea que ya no está
//   "sin iniciar" cuenta, incluidas las en curso. Es avance, no cierre.
// · El ESTADO describe la situación de la lista: solo está finalizada cuando
//   no queda nada por hacer, y ahí las No ejecutadas sí cuentan como cerradas
//   (se decidió no hacerlas), pero las en curso no.
export function progresoLista(tareas: { estado: string }[]): {
  porcentaje: number;
  estado: string;
  arrancadas: number;
  total: number;
} {
  const total = tareas.length;
  const arrancadas = tareas.filter((t) => t.estado !== "sin_iniciar").length;
  const cerradas = tareas.filter(
    (t) => t.estado === "finalizada" || t.estado === "no_ejecutada",
  ).length;

  // Una lista vacía se considera sin iniciar: no arrancó nada todavía.
  const estado =
    total === 0 || arrancadas === 0
      ? "sin_iniciar"
      : cerradas === total
        ? "finalizada"
        : "en_curso";

  return {
    porcentaje: total > 0 ? Math.round((arrancadas / total) * 100) : 0,
    estado,
    arrancadas,
    total,
  };
}

export type ListaRoadmapVista = {
  id: string;
  nombre: string;
  tareas: TareaRoadmapFila[];
};
