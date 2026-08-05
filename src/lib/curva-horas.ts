import { DIA_MS } from "@/lib/dias-habiles";

// Serie acumulada por semana de horas presupuestadas entregadas contra horas
// reales. La usan el Home del proyecto (un cliente) y el Home de CORE (varios
// clientes sumados): en los dos casos es un acumulado de horas totales, nunca
// un promedio.

export type AporteHoras = { fecha: Date; horas: number };

export type CurvaHorasDatos = {
  semanas: string[]; // etiqueta dd/mm del lunes de cada semana
  entregadas: number[];
  reales: number[];
};

// Lunes (UTC) de la semana a la que pertenece una fecha. Las columnas @db.Date
// llegan como medianoche UTC, así que todo el cálculo va en UTC para que en
// Argentina no se corra un día.
export function lunesDe(fecha: Date): Date {
  const d = new Date(fecha.getTime());
  const offset = (d.getUTCDay() + 6) % 7; // lunes = 0 … domingo = 6
  d.setUTCDate(d.getUTCDate() - offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Las dos series comparten el mismo eje —de la primera semana con actividad a
// la última— para poder compararlas punto a punto; una semana sin movimiento
// repite el acumulado anterior en vez de cortar la línea.
//
// Con `desde`/`hasta` el eje se fuerza a ese rango: es lo que hace que el
// gráfico responda al filtro de fechas aunque no haya actividad en los bordes.
export function construirCurvaHoras(
  planificados: AporteHoras[],
  realizados: AporteHoras[],
  rango?: { desde: Date; hasta: Date },
): CurvaHorasDatos {
  const todos = [...planificados, ...realizados];
  if (!rango && todos.length === 0) {
    return { semanas: [], entregadas: [], reales: [] };
  }

  const inicio = lunesDe(
    rango ? rango.desde : new Date(Math.min(...todos.map((a) => a.fecha.getTime()))),
  );
  const fin = lunesDe(
    rango ? rango.hasta : new Date(Math.max(...todos.map((a) => a.fecha.getTime()))),
  );

  const sumarPorSemana = (aportes: AporteHoras[]) => {
    const m = new Map<number, number>();
    for (const a of aportes) {
      const k = lunesDe(a.fecha).getTime();
      m.set(k, (m.get(k) ?? 0) + a.horas);
    }
    return m;
  };
  const plan = sumarPorSemana(planificados);
  const real = sumarPorSemana(realizados);

  const semanas: string[] = [];
  const entregadas: number[] = [];
  const reales: number[] = [];
  let accPlan = 0;
  let accReal = 0;

  for (let t = inicio.getTime(); t <= fin.getTime(); t += 7 * DIA_MS) {
    const d = new Date(t);
    accPlan += plan.get(t) ?? 0;
    accReal += real.get(t) ?? 0;
    semanas.push(
      `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    // Dos decimales: las horas se cargan en fracciones de 15 minutos.
    entregadas.push(Math.round(accPlan * 100) / 100);
    reales.push(Math.round(accReal * 100) / 100);
  }

  return { semanas, entregadas, reales };
}
