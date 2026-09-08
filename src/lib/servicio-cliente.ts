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

// Meses de CALENDARIO que faltan para el fin del servicio.
//
// Cuenta casilleros de mes, no días: del 8 de septiembre al 1 de diciembre son
// 3, aunque no lleguen a tres meses completos. La pregunta que responde el KPI
// es "en cuántos meses se vence esto", y esa se contesta mirando el almanaque
// -septiembre, octubre, noviembre, diciembre- y no el calendario de 30 días.
//
// El día solo decide una cosa: si la fecha de fin ya pasó, quedan 0. No
// existen los meses negativos de servicio.
//
// Las dos fechas llegan en ISO (YYYY-MM-DD) y en la zona horaria de CORE, que
// es quien define qué día es hoy en Mendoza. Comparar las cadenas alcanza:
// en ISO el orden alfabético es el orden cronológico.
export function mesesDeServicioRestantes(
  finISO: string | null,
  hoyISO: string,
): number | null {
  if (!esISO(finISO) || !esISO(hoyISO)) return null;
  if (finISO <= hoyISO) return 0;
  const [fa, fm] = finISO.split("-").map(Number);
  const [ha, hm] = hoyISO.split("-").map(Number);
  return Math.max(0, (fa - ha) * 12 + (fm - hm));
}

function esISO(v: string | null | undefined): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// El semáforo del contrato. Tres tramos, los mismos colores que el semáforo
// del proyecto: no hace falta un segundo vocabulario de verde, amarillo y rojo.
export type NivelServicio = "verde" | "amarillo" | "rojo";

export function nivelDeServicio(meses: number): NivelServicio {
  if (meses >= 3) return "verde";
  if (meses === 2) return "amarillo";
  return "rojo";
}
