// Conversión entre el formato visible hs:min (ej. "1:30") y el decimal que
// se guarda en la base (1.5) para poder multiplicar por la tarifa.

export function parseHorasHsMin(valor: string): number | null {
  const limpio = valor.trim();
  const conMinutos = /^(\d{1,2}):([0-5]\d)$/.exec(limpio);
  if (conMinutos) {
    const horas = Number(conMinutos[1]);
    const minutos = Number(conMinutos[2]);
    return horas + minutos / 60;
  }
  // Aceptar también "2" o "2.5" para no frustrar la carga rápida.
  const decimal = /^\d{1,2}([.,]\d+)?$/.exec(limpio);
  if (decimal) {
    return Number(limpio.replace(",", "."));
  }
  return null;
}

export function formatHorasHsMin(decimal: number): string {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return `${horas}:${String(minutos).padStart(2, "0")}`;
}
