// Conversiones entre el ISO "YYYY-MM-DD" que viaja al servidor y el Date
// local con el que se dibujan los calendarios.
//
// Ojo con la diferencia respecto de lib/dias-habiles: allá todo es UTC porque
// se compara contra columnas @db.Date. Acá se trabaja en hora LOCAL a
// propósito: un calendario tiene que pintar como "hoy" el día que la persona
// tiene en su reloj, no el de UTC. La conversión a UTC ocurre recién en el
// servidor, al parsear el ISO.

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function fromISO(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [a, m, d] = s.split("-").map(Number);
  const date = new Date(a, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

export function fmtDisplay(s: string): string {
  const d = fromISO(s);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

// Lunes = 0 … Domingo = 6. Es el orden en que se dibujan las columnas.
export function offsetLunes(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function esFinDeSemana(d: Date): boolean {
  const x = d.getDay();
  return x === 0 || x === 6;
}

export const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
