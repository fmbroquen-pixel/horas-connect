// Qué se puede hacer con un cliente inactivo.
//
// Inactivar no es borrar. Hasta ahora `activo: false` sacaba al cliente de
// TODAS las consultas, así que apagarlo hacía desaparecer sus horas, sus
// viáticos y su rentabilidad: los datos seguían en la base pero ninguna
// pantalla los alcanzaba. Eso es perder trazabilidad sin haber borrado nada.
//
// La distinción es entre dos preguntas que antes usaban el mismo filtro:
//
//   · ¿Se le puede cargar algo nuevo?  → no, desde la fecha de inactivación.
//   · ¿Se puede ver lo que ya tiene?   → sí, siempre.

export type ClienteVigencia = {
  activo: boolean;
  // Null = nunca se inactivó. También quedan en null los que ya estaban
  // inactivos antes de que existiera el campo: sin fecha, no hay corte que
  // pueda esconderles el historial.
  inactivadoEn: Date | null;
};

// Medianoche UTC de una fecha, en ISO. Las fechas de los registros son de
// calendario y se comparan como texto, que para ISO es lo mismo que comparar
// cronológicamente.
export function isoDe(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// ¿Se le puede cargar algo nuevo?
//
// No lleva fecha del registro a propósito. Se evaluó dejar cargar lo anterior a
// la inactivación —las horas de julio de un cliente apagado en agosto—, pero el
// cliente inactivo no aparece en el selector de carga, así que esa puerta no se
// podría abrir desde la app y quedaría una regla que nadie puede ejercer. Si
// alguna vez hace falta cargar hacia atrás, el camino es reactivar, cargar y
// volver a inactivar.
export function admiteCargaNueva(cliente: ClienteVigencia): boolean {
  return cliente.activo;
}

// ¿Tiene que aparecer al consultar un período que arranca en `desdeISO`?
//
// Un cliente inactivado en agosto sigue siendo parte de julio: si el filtro no
// lo ofreciera, sus horas de julio quedarían fuera del total del mes y el
// número no cerraría con lo que efectivamente se trabajó.
export function apareceEnPeriodo(
  cliente: ClienteVigencia,
  desdeISO: string,
): boolean {
  if (cliente.activo) return true;
  // Sin fecha de inactivación se lo muestra igual: es preferible ofrecer un
  // cliente de más en un filtro que esconder horas que existen.
  if (!cliente.inactivadoEn) return true;
  return desdeISO < isoDe(cliente.inactivadoEn);
}
