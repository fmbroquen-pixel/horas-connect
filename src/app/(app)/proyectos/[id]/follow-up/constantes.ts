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
//
// "En curso" es naranja y no violeta: el violeta es el color de la marca y está
// en los botones, los enlaces y el resaltado, así que un estado pintado de
// violeta no se leía como estado. Naranja además ordena la escala como un
// semáforo —rojo, naranja, verde— y deja el violeta neutro para "todavía no
// pasó nada".
export const COLOR_ESTADO: Record<string, string> = {
  sin_iniciar: "#a5a3d6",
  en_curso: "#fb923c",
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
// El PORCENTAJE mide cuánto está CERRADO, no cuánto arrancó: una tarea en
// curso todavía no entregó nada, así que no suma. Las No ejecutadas sí
// cuentan como cerradas —se decidió no hacerlas— o dejarían una lista trabada
// en 90% para siempre.
//
// El ESTADO usa la misma cuenta, más el matiz de que una lista donde nada
// arrancó está "sin iniciar" y no "en curso".
export function progresoLista(tareas: { estado: string }[]): {
  porcentaje: number;
  estado: string;
  cerradas: number;
  total: number;
} {
  const total = tareas.length;
  const cerradas = tareas.filter(
    (t) => t.estado === "finalizada" || t.estado === "no_ejecutada",
  ).length;
  const arrancoAlgo = tareas.some((t) => t.estado !== "sin_iniciar");

  // Una lista vacía se considera sin iniciar: no arrancó nada todavía.
  const estado =
    total === 0 || !arrancoAlgo
      ? "sin_iniciar"
      : cerradas === total
        ? "finalizada"
        : "en_curso";

  return {
    porcentaje: total > 0 ? Math.round((cerradas / total) * 100) : 0,
    estado,
    cerradas,
    total,
  };
}

export type ListaRoadmapVista = {
  id: string;
  nombre: string;
  tareas: TareaRoadmapFila[];
};
