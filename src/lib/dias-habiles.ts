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

export function fechaDesdeISO(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

export function isoDesdeFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// Hoy a medianoche UTC, para comparar contra columnas @db.Date.
export function hoyUTC(): Date {
  const ahora = new Date();
  return new Date(
    Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
  );
}
