// Aritmética de semanas sobre fechas ISO (YYYY-MM-DD), para el cliente.
//
// Aparte de lib/dias-habiles, que trabaja con Date en UTC porque es lo que
// llega de Prisma. En el navegador las fechas se manejan como texto ISO —así
// no hay hora, ni zona, ni un `new Date("2026-09-08")` que en Argentina se lea
// como el 7— y estas tres funciones son las que el diálogo de agrupar necesita.
//
// La regla que expresan es una sola: un grupo entra en una semana.

const DIA_MS = 24 * 60 * 60 * 1000;

function aUTC(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function aISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// El lunes de la semana que ocuparía una tarea que arranca ese día. Un sábado o
// un domingo caen en la semana SIGUIENTE: la que termina ya cerró. Es la misma
// regla que `semanaDe` en dias-habiles, sobre texto.
export function lunesDeISO(iso: string): string | null {
  const d = aUTC(iso);
  if (!d) return null;
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() - 1));
  return aISO(d);
}

export function viernesDeISO(iso: string): string {
  const lunes = lunesDeISO(iso);
  if (!lunes) return "";
  return aISO(new Date(aUTC(lunes)!.getTime() + 4 * DIA_MS));
}

// El mismo día si es hábil; si no, el lunes siguiente.
export function siguienteHabilISO(iso: string): string {
  const d = aUTC(iso);
  if (!d) return "";
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return aISO(d);
}

export function mismaSemanaISO(a: string, b: string): boolean {
  const la = lunesDeISO(a);
  const lb = lunesDeISO(b);
  return la !== null && la === lb;
}
