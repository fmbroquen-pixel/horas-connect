import { hoyISO } from "@/lib/formato";

export const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Mes en curso, según el reloj de quien mira.
export function mesActual(): { anio: number; mes: number } {
  const [a, m] = hoyISO().split("-").map(Number);
  return { anio: a, mes: m };
}

// Valida lo que viene por la URL y cae al mes actual si no sirve. También
// recorta el futuro: no hay datos por delante de hoy y ofrecerlos solo lleva a
// pantallas vacías.
export function mesDeParams(
  anio?: string,
  mes?: string,
): { anio: number; mes: number } {
  const hoy = mesActual();
  const a = Number(anio);
  const m = Number(mes);
  if (!Number.isInteger(a) || !Number.isInteger(m) || m < 1 || m > 12) return hoy;
  if (a < 2000 || a > hoy.anio || (a === hoy.anio && m > hoy.mes)) return hoy;
  return { anio: a, mes: m };
}

// El rango que cubre un mes, en ISO.
//
// El mes en curso se corta en hoy: mostrar hasta el 31 cuando estamos a 12
// sugiere que faltan cargar días que todavía no existen, y ensancha los
// gráficos con un tramo vacío.
export function rangoDelMes(
  anio: number,
  mes: number,
  // El "hoy" contra el que se recorta. Se inyecta para poder probarlo; en la
  // app siempre es el día real.
  hoy: string = hoyISO(),
): { desde: string; hasta: string } {
  const dd = (n: number) => String(n).padStart(2, "0");
  const desde = `${anio}-${dd(mes)}-01`;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const finDelMes = `${anio}-${dd(mes)}-${dd(ultimo)}`;
  return { desde, hasta: finDelMes > hoy ? hoy : finDelMes };
}

export function mesAnterior({ anio, mes }: { anio: number; mes: number }) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function mesSiguiente({ anio, mes }: { anio: number; mes: number }) {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

// ¿Ese mes ya pasó o es el actual? Se usa para apagar "Siguiente".
export function esFuturo({ anio, mes }: { anio: number; mes: number }): boolean {
  const hoy = mesActual();
  return anio > hoy.anio || (anio === hoy.anio && mes > hoy.mes);
}
