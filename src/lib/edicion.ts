// Cómo se cuenta una edición en la interfaz.
//
// El dato se arma en el servidor y viaja como texto: la fila solo tiene que
// mostrarlo. Devuelve null cuando el registro nunca se editó, que es el caso
// normal y no merece ninguna marca.
export function marcaDeEdicion(
  editadoPor: { nombre: string } | null | undefined,
  updatedAt: Date,
): string | null {
  if (!editadoPor) return null;
  const d = String(updatedAt.getDate()).padStart(2, "0");
  const m = String(updatedAt.getMonth() + 1).padStart(2, "0");
  return `Editado por ${editadoPor.nombre} el ${d}/${m}/${updatedAt.getFullYear()}`;
}
