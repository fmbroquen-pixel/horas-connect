// La fecha operativa de CORE, en una sola función.
//
// El problema que resuelve: el servidor de Vercel corre en UTC. A las 21:49 del
// 31/08 en Mendoza ya son las 00:49 del 01/09 en UTC, así que cualquier "hoy"
// calculado con `new Date()` sobre el reloj del servidor adelantaba el día y la
// app mostraba septiembre mientras en Argentina todavía era agosto. En el
// cliente el mismo código daba bien —el navegador sí está en Argentina—, lo que
// hacía que el bug apareciera solo en producción y solo de noche.
//
// La regla: los instantes se siguen guardando en UTC (una hora es una hora en
// cualquier parte), pero todo lo que sea CALENDARIO —qué día es hoy, qué mes
// está en curso, cuándo cambia el día— se resuelve en la zona de la empresa.
//
// Nota sobre `Intl`: es la única forma correcta de hacer esto sin una librería.
// Restar un offset fijo de 3 horas funcionaría hoy pero no es lo que se está
// diciendo —Argentina no tiene horario de verano desde 2009, pero eso es una
// decisión política que ya cambió cinco veces y puede volver a cambiar—. `Intl`
// consulta la base de datos de zonas horarias del sistema y sigue estando bien
// el día que cambie.

export const ZONA_HORARIA = "America/Argentina/Mendoza";

const formateador = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type PartesFecha = {
  anio: number;
  mes: number; // 1-12, no 0-11
  dia: number;
  hora: number;
  minuto: number;
};

// El calendario y el reloj de Argentina en un instante dado.
//
// Se arma con `formatToParts` y no con `format` porque el string depende del
// locale y del navegador; las partes tienen nombre y no se reordenan.
export function partesEnZona(instante: Date = new Date()): PartesFecha {
  const partes: Record<string, string> = {};
  for (const p of formateador.formatToParts(instante)) {
    if (p.type !== "literal") partes[p.type] = p.value;
  }
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    // A medianoche `hour12: false` devuelve "24" en algunos runtimes en vez de
    // "00". Es la única irregularidad del formato y conviene normalizarla acá.
    hora: Number(partes.hour) % 24,
    minuto: Number(partes.minute),
  };
}

const dd = (n: number) => String(n).padStart(2, "0");

// Qué día es hoy en Argentina, en YYYY-MM-DD.
//
// Recibe el instante para poder probarla: en la app siempre es el ahora real,
// pero un test necesita poder pararse a las 21:49 del 31/08.
export function hoyISO(instante: Date = new Date()): string {
  const { anio, mes, dia } = partesEnZona(instante);
  return `${anio}-${dd(mes)}-${dd(dia)}`;
}

// El mismo día, como Date a medianoche UTC.
//
// Es el formato con el que Prisma devuelve las columnas @db.Date, así que es
// contra esto que se comparan las fechas guardadas. No es "la medianoche de
// Argentina expresada en UTC" —eso sería las 03:00— sino el día calendario
// tratado como un rótulo, que es como está guardado.
export function hoyUTC(instante: Date = new Date()): Date {
  const { anio, mes, dia } = partesEnZona(instante);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

// El mes en curso en Argentina.
export function mesActual(instante: Date = new Date()): {
  anio: number;
  mes: number;
} {
  const { anio, mes } = partesEnZona(instante);
  return { anio, mes };
}
