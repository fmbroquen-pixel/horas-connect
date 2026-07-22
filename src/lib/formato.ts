// Formato contable/monetario para mostrar montos (es-AR: 1.234,56).
const formateadorUsd = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMonto(valor: number): string {
  return formateadorUsd.format(valor);
}

export function formatFecha(fecha: Date): string {
  // Los campos @db.Date llegan como medianoche UTC; formatear en UTC evita
  // que se muestre el día anterior en husos horarios negativos como el de
  // Argentina.
  return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

// Fecha local de hoy en formato YYYY-MM-DD (para inputs type="date" y
// comparaciones de "no se pueden cargar horas futuras").
export function hoyISO(): string {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function esISO(v?: string): boolean {
  return Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
}

export function restarDiasISO(iso: string, dias: number): string {
  const fecha = new Date(iso + "T00:00:00Z");
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

// Rango por defecto de los últimos 30 días (o el rango pasado por parámetros
// si es válido). Devuelve strings YYYY-MM-DD listos para el filtro.
export function rangoDefault30(
  desdeParam?: string,
  hastaParam?: string,
): { desde: string; hasta: string } {
  const hoy = hoyISO();
  const desde = esISO(desdeParam) ? desdeParam! : restarDiasISO(hoy, 30);
  const hasta = esISO(hastaParam) ? hastaParam! : hoy;
  return desde > hasta ? { desde: hasta, hasta: desde } : { desde, hasta };
}

// Los 7 días (Lunes a Domingo) de la semana actual, según la fecha local del
// sistema. Mismo criterio Lunes=0…Domingo=6 que usa el DatePicker.
export function semanaActualISO(): string[] {
  const hoy = hoyISO();
  const [a, m, d] = hoy.split("-").map(Number);
  const fecha = new Date(a, m - 1, d);
  const offsetLunes = (fecha.getDay() + 6) % 7;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() - offsetLunes);

  const dias: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d2 = new Date(lunes);
    d2.setDate(lunes.getDate() + i);
    const mm = String(d2.getMonth() + 1).padStart(2, "0");
    const dd = String(d2.getDate()).padStart(2, "0");
    dias.push(`${d2.getFullYear()}-${mm}-${dd}`);
  }
  return dias;
}
