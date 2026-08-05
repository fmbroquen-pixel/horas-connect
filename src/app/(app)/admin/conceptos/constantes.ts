// Tipo compartido entre la página (Server Component) y la fila (cliente).
export type ConceptoFila = {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
};
