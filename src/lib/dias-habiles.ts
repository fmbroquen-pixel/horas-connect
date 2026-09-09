// Aritmética de días hábiles (lunes a viernes) para el Roadmap. No contempla
// feriados: si una tarea cae sobre uno, el usuario corre la fecha a mano y el
// resto de la cadena se reacomoda solo.
//
// Todo se calcula en UTC porque las columnas @db.Date de Prisma llegan como
// medianoche UTC; usar la hora local haría que en Argentina (UTC-3) cada
// fecha se leyera como el día anterior.

export const DIA_MS = 24 * 60 * 60 * 1000;

export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getUTCDay(); // 0 = domingo, 6 = sábado
  return dia !== 0 && dia !== 6;
}

// El mismo día si ya es hábil; si no, el lunes siguiente.
export function siguienteDiaHabil(fecha: Date): Date {
  const cur = new Date(fecha.getTime());
  while (!esDiaHabil(cur)) cur.setUTCDate(cur.getUTCDate() + 1);
  return cur;
}

// Fecha de fin de una tarea que arranca en `inicio` y dura `dias` hábiles,
// contando ambos extremos: una tarea de 1 día empieza y termina el mismo día.
export function finTrasDiasHabiles(inicio: Date, dias: number): Date {
  const cur = siguienteDiaHabil(inicio);
  let restantes = Math.max(1, Math.trunc(dias)) - 1;
  while (restantes > 0) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (esDiaHabil(cur)) restantes--;
  }
  return cur;
}

// Cantidad de días hábiles entre dos fechas, ambas inclusive.
export function diasHabilesEntre(inicio: Date, fin: Date): number {
  if (fin < inicio) return 0;
  let dias = 0;
  const cur = new Date(inicio.getTime());
  while (cur <= fin) {
    if (esDiaHabil(cur)) dias++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dias;
}

// ── Semanas hábiles ───────────────────────────────────────────────────────
//
// El Roadmap planifica por SEMANAS, no por días: cada tarea ocupa una semana
// hábil completa -lunes a viernes- y la siguiente arranca el lunes posterior.
// Una semana se identifica por su lunes, así que toda la aritmética del
// scheduler se hace sobre lunes y estas tres funciones son todo lo que hace
// falta.

// Los días hábiles de una semana. Es la duración por defecto de una tarea del
// Roadmap: una tarea, una semana.
export const DIAS_SEMANA_HABIL = 5;

// El lunes de la semana que ocuparía una tarea que arranca en `fecha`.
//
// Un sábado o un domingo caen en la semana SIGUIENTE y no en la que termina:
// nadie planifica trabajo para una semana que ya cerró. Por eso primero se
// corre al próximo día hábil y recién ahí se busca el lunes. (Es distinto de
// `lunesDe` en curva-horas, que responde otra pregunta —en qué semana cayó
// este dato— y ahí un domingo sí pertenece a la semana que termina.)
export function semanaDe(fecha: Date): Date {
  const habil = siguienteDiaHabil(fecha);
  const cur = new Date(habil.getTime());
  cur.setUTCDate(cur.getUTCDate() - (cur.getUTCDay() - 1)); // lunes = 1
  cur.setUTCHours(0, 0, 0, 0);
  return cur;
}

// El viernes de una semana dada por su lunes.
export function finDeSemanaHabil(lunes: Date): Date {
  const cur = new Date(lunes.getTime());
  cur.setUTCDate(cur.getUTCDate() + 4);
  return cur;
}

// A cuántos días del lunes cae esta fecha: lunes 0 … viernes 4. Un fin de
// semana se recorta al viernes; una tarea no puede empezar ni terminar ahí.
export function offsetEnLaSemana(fecha: Date): number {
  return Math.min(4, Math.max(0, (fecha.getUTCDay() + 6) % 7));
}

export function sumarDias(desde: Date, dias: number): Date {
  const cur = new Date(desde.getTime());
  cur.setUTCDate(cur.getUTCDate() + dias);
  return cur;
}

export function sumarSemanas(lunes: Date, semanas: number): Date {
  const cur = new Date(lunes.getTime());
  cur.setUTCDate(cur.getUTCDate() + semanas * 7);
  return cur;
}

// Cuántas semanas hay entre dos lunes. Nunca negativa: si el segundo es
// anterior, se los toma como la misma semana en vez de inventar un
// desplazamiento hacia atrás que correría el grupo en cada recálculo.
export function semanasEntre(desde: Date, hasta: Date): number {
  const dif = Math.round((hasta.getTime() - desde.getTime()) / (7 * DIA_MS));
  return Math.max(0, dif);
}

export function fechaDesdeISO(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

export function isoDesdeFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// Se reexporta por comodidad —quien hace cuentas de días hábiles suele
// necesitar hoy— pero el cálculo está en lib/zona-horaria. Acá tomaba el día
// del reloj del proceso, que en Vercel es UTC y adelantaba la fecha.
export { hoyUTC } from "@/lib/zona-horaria";
