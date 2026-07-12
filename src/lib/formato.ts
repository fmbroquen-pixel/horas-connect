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
