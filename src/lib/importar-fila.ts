// Las dos decisiones por fila de la importación de horas: de quién son y
// contra qué cliente van.
//
// Están acá y no dentro del importador para poder probarlas. Son el punto
// donde una fila se acepta o se rechaza, y donde un mensaje mal elegido hace
// perder una tarde: "Cliente inexistente o no asignado" juntaba dos problemas
// que se arreglan de formas distintas, y mandó a revisar la ortografía de un
// nombre que estaba perfecto.
//
// Todo entra ya normalizado por clave (ver lib/normalizar-nombre) y sale
// resuelto a id: el nombre solo sirve para encontrar, nunca para guardar.

export type Persona = { id: string; nombre: string };
export type ClienteCatalogo = { nombre: string; activo: boolean };

export type Resuelto<T> = { valor: T } | { error: string };

export function esError<T>(r: Resuelto<T>): r is { error: string } {
  return "error" in r;
}

// De quién son las horas de esta fila.
//
// Tres respuestas y no dos: existe y puedo cargarle, no existe, o existe pero
// no puedo. La tercera es un permiso y se arregla en otro lado; confundirla
// con la segunda manda a corregir un nombre bien escrito.
export function resolverDuenio(
  celda: string,
  clave: string,
  visiblesPorNombre: Map<string, Persona>,
  todosPorNombre: Map<string, Persona>,
): Resuelto<Persona> {
  if (!celda.trim()) return { error: "Falta el usuario" };
  const visible = visiblesPorNombre.get(clave);
  if (visible) return { valor: visible };
  const existe = todosPorNombre.get(clave);
  return {
    error: existe
      ? `No podés cargar horas de "${existe.nombre}"`
      : "Usuario inexistente",
  };
}

// Contra qué cliente va la fila, para el dueño ya resuelto.
//
// La cartera es la DEL DUEÑO, no la de quien importa: un admin puede traer
// horas de un cliente que él no tiene asignado pero el mentor sí.
export function resolverClienteDeFila(
  celda: string,
  clave: string,
  duenio: Persona,
  carteraDelDuenio: Map<string, Persona>,
  catalogoCompleto: Map<string, ClienteCatalogo>,
): Resuelto<Persona> {
  if (!celda.trim()) return { error: "Falta el cliente" };
  const suyo = carteraDelDuenio.get(clave);
  if (suyo) return { valor: suyo };

  const real = catalogoCompleto.get(clave);
  if (!real) return { error: "Cliente inexistente" };
  if (!real.activo) {
    return { error: `"${real.nombre}" está inactivo: no admite registros nuevos` };
  }
  return { error: `"${real.nombre}" no está asignado a ${duenio.nombre}` };
}

// La clave de duplicado de un registro. Incluye al dueño a propósito: dos
// mentores pueden haber hecho lo mismo el mismo día para el mismo cliente, y
// eso son dos registros distintos. Sin el usuario, la segunda fila del archivo
// se descartaba en silencio como "duplicada".
export function claveDuplicado(r: {
  usuarioId: string;
  fechaISO: string;
  clienteId: string;
  conceptoId: string;
  ownership: string;
  modalidad: string;
  horas: number;
}): string {
  return [
    r.usuarioId,
    r.fechaISO,
    r.clienteId,
    r.conceptoId,
    r.ownership,
    r.modalidad,
    r.horas,
  ].join("|");
}
