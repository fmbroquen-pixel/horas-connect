// La ventana de servicio de un cliente: cuándo termina y cuánto le queda.
//
// La fecha de finalización NO se guarda en la base. Se deriva siempre de
// `fechaInicio + duracionMeses`, y esa regla ya estaba escrita: la pantalla de
// Settings → Clientes la muestra como campo de solo lectura. Estaba en las
// constantes de esa pantalla, que es un lugar razonable mientras la usaba una
// sola, pero el Home del proyecto necesita la misma cuenta y copiarla habría
// creado dos fechas de fin que podían discrepar.
//
// Sin base de datos a propósito: entra lo que la base ya devolvió y sale la
// decisión, así se prueba sin levantar nada.

// Suma meses a una fecha ISO (YYYY-MM-DD) ajustando el día al último del mes
// destino cuando no existe (31/01 + 1 mes → 28/02).
export function sumarMesesISO(iso: string, meses: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isInteger(meses)) return null;
  const [a, m, d] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = total % 12; // 0-11
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const dia = Math.min(d, ultimoDia);
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// El último día de servicio, o null si al cliente le falta alguno de los dos
// datos. Null no es cero: es "no se sabe", y quien lo muestre tiene que decir
// eso y no un número inventado.
export function finDeServicioISO(
  inicioISO: string | null | undefined,
  duracionMeses: number | null | undefined,
): string | null {
  if (!inicioISO || !duracionMeses || duracionMeses < 1) return null;
  return sumarMesesISO(inicioISO, duracionMeses);
}

// Meses COMPLETOS que faltan para el fin del servicio.
//
// Siempre hacia abajo: quedan 2 meses recién cuando pasaron los dos enteros.
// Del 8 de septiembre al 5 de diciembre no son 3 meses, son 2 y monedas, y
// redondear para arriba haría creer que hay un mes más de contrato del que
// hay. Menos de un mes es 0, y un servicio ya vencido también: no existen los
// meses negativos de servicio.
export function mesesDeServicioRestantes(
  finISO: string | null,
  hoyISO: string,
): number | null {
  if (!finISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;
  const [fa, fm, fd] = finISO.split("-").map(Number);
  const [ha, hm, hd] = hoyISO.split("-").map(Number);
  let meses = (fa * 12 + fm) - (ha * 12 + hm);
  // El último mes no está completo si todavía no se llegó al día del corte.
  if (fd < hd) meses -= 1;
  return Math.max(0, meses);
}

// El semáforo del contrato. Tres tramos, los mismos colores que el semáforo
// del proyecto: no hace falta un segundo vocabulario de verde, amarillo y rojo.
export type NivelServicio = "verde" | "amarillo" | "rojo";

export function nivelDeServicio(meses: number): NivelServicio {
  if (meses >= 3) return "verde";
  if (meses === 2) return "amarillo";
  return "rojo";
}
