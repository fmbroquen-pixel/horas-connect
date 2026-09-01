import { hoyISO } from "@/lib/zona-horaria";

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

// Se reexporta para no romper los veinte lugares que ya la importan de acá,
// pero el cálculo vive en lib/zona-horaria: usaba el reloj de quien ejecutaba
// —el navegador en el cliente, UTC en el servidor de Vercel— y esas dos
// respuestas no son la misma después de las 21:00 en Argentina.
export { hoyISO };

export function esISO(v?: string): boolean {
  return Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
}

export function restarDiasISO(iso: string, dias: number): string {
  const fecha = new Date(iso + "T00:00:00Z");
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

// Los 7 días (Lunes a Domingo) de la semana actual. Mismo criterio
// Lunes=0…Domingo=6 que usa el DatePicker.
//
// La aritmética va entera en UTC: sobre fechas locales, el día de la semana lo
// decidía el huso del proceso.
export function semanaActualISO(hoy: string = hoyISO()): string[] {
  const [a, m, d] = hoy.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  const offsetLunes = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - offsetLunes);

  const dias: string[] = [];
  for (let i = 0; i < 7; i++) {
    dias.push(fecha.toISOString().slice(0, 10));
    fecha.setUTCDate(fecha.getUTCDate() + 1);
  }
  return dias;
}
