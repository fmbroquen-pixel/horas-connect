// Una sola tarea "En curso" por lista.
//
// Las tareas de una lista son secuenciales: representan el avance del proyecto,
// y dos en curso al mismo tiempo no describen nada. Antes nada lo impedía, así
// que el estado se podía dejar en cualquier combinación y el resumen de la lista
// —que deduce su propio estado de las tareas— quedaba mostrando un avance que no
// existía.

export type TareaEstado = { id: string; nombre: string; estado: string };

// La tarea que ya está en curso en la lista y que impide poner otra, o null si
// no hay ninguna.
//
// Se excluye la propia: volver a marcar como "En curso" la que ya lo está no es
// un conflicto, es una operación sin efecto.
export function enCursoQueEstorba(
  tareasDeLaLista: TareaEstado[],
  idQueSeMarca: string,
): TareaEstado | null {
  return (
    tareasDeLaLista.find(
      (t) => t.estado === "en_curso" && t.id !== idQueSeMarca,
    ) ?? null
  );
}

// Los estados con los que se puede cerrar la tarea que venía en curso al
// desplazarla. "En curso" no está: es justamente el que se le está sacando.
export const CIERRES_EN_CURSO = ["finalizada", "sin_iniciar", "no_ejecutada"] as const;

export type CierreEnCurso = (typeof CIERRES_EN_CURSO)[number];

export function esCierreValido(valor: string): valor is CierreEnCurso {
  return (CIERRES_EN_CURSO as readonly string[]).includes(valor);
}
