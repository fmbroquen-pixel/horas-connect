import { mesActual } from "@/lib/zona-horaria";

export { mesActual };

export const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

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

// El rango que cubre un mes, en ISO: del 1 al último día. Siempre el mes
// calendario completo, también el que está en curso.
//
// Antes el mes en curso se cortaba en hoy, y eso creaba dos ventanas
// distintas conviviendo en la misma pantalla. Se notaba en las horas
// estimadas: el KPI decía cuánto vence en el mes, pero solo contaba hasta hoy,
// así que el número crecía solo con el correr de los días y el denominador se
// movía bajo los pies de quien lo miraba.
//
// El recorte no hacía falta para lo demás: no se cargan horas ni viáticos con
// fecha futura, y una tarea que termina la semana que viene no puede estar
// finalizada. Donde el mes completo sí cambia algo es en el plan, que es
// justamente lo que hay que poder ver entero.
export function rangoDelMes(
  anio: number,
  mes: number,
): { desde: string; hasta: string } {
  const dd = (n: number) => String(n).padStart(2, "0");
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${dd(mes)}-01`,
    hasta: `${anio}-${dd(mes)}-${dd(ultimo)}`,
  };
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

// ¿Es EL mes en curso? Distinto de `esFuturo`: acá interesa la coincidencia
// exacta, no el orden. Lo usa "Próximas dos semanas", que mira hacia adelante
// desde hoy y por eso solo tiene sentido parada en el mes actual: verla desde
// un mes anterior mezclaría dos tiempos en la misma pantalla.
export function esMesActual({ anio, mes }: { anio: number; mes: number }): boolean {
  const hoy = mesActual();
  return anio === hoy.anio && mes === hoy.mes;
}
