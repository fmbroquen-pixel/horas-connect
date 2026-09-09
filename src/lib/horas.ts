// Conversión entre el formato visible hs:min (ej. "1:30") y el decimal que
// se guarda en la base (1.5) para poder multiplicar por la tarifa.

export function parseHorasHsMin(valor: string): number | null {
  const limpio = valor.trim();
  const conMinutos = /^(\d{1,2}):([0-5]\d)$/.exec(limpio);
  if (conMinutos) {
    const horas = Number(conMinutos[1]);
    const minutos = Number(conMinutos[2]);
    return horas + minutos / 60;
  }
  // Aceptar también "2" o "2.5" para no frustrar la carga rápida.
  const decimal = /^\d{1,2}([.,]\d+)?$/.exec(limpio);
  if (decimal) {
    return Number(limpio.replace(",", "."));
  }
  return null;
}

export function formatHorasHsMin(decimal: number): string {
  const totalMinutos = Math.round(decimal * 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas}:${String(minutos).padStart(2, "0")}`;
}

// Reformatea lo que el usuario escribió (decimal con coma o punto, o ya un
// hs:min) a "hora:minuto" para mostrarlo en el mismo campo. Devuelve null si
// no es un valor de horas válido.
export function reformatEntradaHoras(valor: string): string | null {
  const decimal = parseHorasHsMin(valor);
  if (decimal === null || decimal <= 0 || decimal > 24) return null;
  return formatHorasHsMin(decimal);
}

// Las horas estimadas cuando cambia la cantidad de personas de una tarea.
//
// Lo estimado es el esfuerzo TOTAL, no lo que pone cada uno: un workshop de 3
// horas que pasa a darse entre dos cuesta 6. Sin este ajuste, sumar un mentor
// no movía el presupuesto y el plan mentía sobre lo que iba a costar.
//
// Se calcula sobre el valor ACTUAL y no sobre uno base guardado aparte: por eso
// editar las horas a mano no rompe la regla. Con 2 personas y 6 horas escritas
// a mano, pasar a 1 da 3 y volver a 2 devuelve las 6.
//
// Redondea a dos decimales, que es lo que admite la columna. Con valores de
// menos de quince minutos la ida y vuelta puede correrse un minuto: es el
// precio de que las horas sean un decimal y no una cuenta de minutos.
export function escalarHorasPorPersonas(
  horas: number,
  personasActuales: number,
  personasNuevas: number,
): number {
  if (personasActuales <= 0 || personasNuevas <= 0) return horas;
  return Math.round(((horas * personasNuevas) / personasActuales) * 100) / 100;
}
