// La clave con la que se busca un cliente o un concepto por su nombre.
//
// Un archivo importado viene de Excel o de una planilla, no de un formulario:
// trae espacios de sobra, mayúsculas de cualquier forma, espacios finos o duros
// que Excel mete solos, y acentos escritos o no según quién cargó la fila. Nada
// de eso cambia de qué cliente se está hablando, así que nada de eso tiene que
// decidir si la fila entra.
//
// Vive acá y no dentro del importador para poder probarlo: es la función que
// decide si una fila se resuelve o se rechaza, y cuando falla el mensaje manda
// a revisar la ortografía de un nombre que estaba bien escrito.
//
// Se verificó contra los datos reales que ningún par de clientes ni de
// conceptos colapsa a la misma clave, así que no puede resolver al equivocado.
export function normalizarNombre(s: string): string {
  return (
    s
      // Separa los acentos de su letra para poder sacarlos.
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      // Espacio duro, fino y de ancho cero: se ven igual que un espacio normal
      // y por eso son los que más cuestan de encontrar a ojo.
      .replace(/[\u00a0\u2007\u202f\u200b]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}
