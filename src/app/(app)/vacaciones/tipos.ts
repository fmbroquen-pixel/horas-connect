export type VacacionFila = {
  id: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  dias: number;
};

// Orden: Fecha inicio · Fecha fin · Días OOO · (acciones)
// IMPORTANTE: este archivo no lleva "use client". El encabezado de la tabla
// vive en un Server Component (page.tsx); si esta constante se exportara
// desde un módulo "use client", el servidor recibiría una referencia de
// cliente en vez del string y la grilla nunca se aplicaría (causa raíz del
// bug de headers comprimidos).
export const GRID_VACACIONES =
  "grid min-w-[700px] grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(120px,1fr)_130px] items-center gap-2";

// Cantidad de días hábiles (excluye sábados y domingos) entre dos fechas ISO,
// ambas inclusive. Es el cálculo por defecto de "Días OOO"; el usuario puede
// editarlo a mano para contemplar feriados u otras excepciones.
export function diasHabilesEntre(inicioISO: string, finISO: string): number | null {
  if (!inicioISO || !finISO) return null;
  const inicio = new Date(inicioISO + "T00:00:00");
  const fin = new Date(finISO + "T00:00:00");
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return null;
  let dias = 0;
  const cur = new Date(inicio);
  while (cur <= fin) {
    const diaSemana = cur.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    cur.setDate(cur.getDate() + 1);
  }
  return dias;
}
