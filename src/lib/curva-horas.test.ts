import { describe, expect, it } from "vitest";
import { construirCurvaHoras, lunesDe } from "./curva-horas";
import { fechaDesdeISO, isoDesdeFecha } from "./dias-habiles";

const d = fechaDesdeISO;

describe("lunesDe", () => {
  it("lleva cualquier día a su lunes", () => {
    // Semana del lun 03 al dom 09 de agosto de 2026.
    for (const dia of ["2026-08-03", "2026-08-07", "2026-08-08", "2026-08-09"]) {
      expect(isoDesdeFecha(lunesDe(d(dia)))).toBe("2026-08-03");
    }
    expect(isoDesdeFecha(lunesDe(d("2026-08-10")))).toBe("2026-08-10");
  });

  it("no muta la fecha que recibe", () => {
    const domingo = d("2026-08-09");
    lunesDe(domingo);
    expect(isoDesdeFecha(domingo)).toBe("2026-08-09");
  });
});

describe("construirCurvaHoras", () => {
  it("sin datos ni rango devuelve una serie vacía", () => {
    expect(construirCurvaHoras([], [])).toEqual({
      semanas: [],
      entregadas: [],
      reales: [],
    });
  });

  it("acumula por semana y no reinicia", () => {
    const r = construirCurvaHoras(
      [
        { fecha: d("2026-08-05"), horas: 2 },
        { fecha: d("2026-08-12"), horas: 3 },
      ],
      [
        { fecha: d("2026-08-03"), horas: 1 },
        { fecha: d("2026-08-13"), horas: 1.5 },
      ],
    );
    expect(r.semanas).toEqual(["03/08", "10/08"]);
    expect(r.entregadas).toEqual([2, 5]);
    expect(r.reales).toEqual([1, 2.5]);
  });

  it("una semana sin movimiento repite el acumulado en vez de cortar", () => {
    const r = construirCurvaHoras(
      [
        { fecha: d("2026-08-03"), horas: 4 },
        { fecha: d("2026-08-17"), horas: 1 },
      ],
      [],
    );
    expect(r.semanas).toEqual(["03/08", "10/08", "17/08"]);
    expect(r.entregadas).toEqual([4, 4, 5]);
    expect(r.reales).toEqual([0, 0, 0]);
  });

  it("con rango el eje lo manda el filtro, no los datos", () => {
    // Es lo que hace que el gráfico responda al filtro de fechas aunque no
    // haya actividad en los bordes del período.
    const r = construirCurvaHoras(
      [{ fecha: d("2026-08-12"), horas: 2 }],
      [],
      { desde: d("2026-08-03"), hasta: d("2026-08-21") },
    );
    expect(r.semanas).toEqual(["03/08", "10/08", "17/08"]);
    expect(r.entregadas).toEqual([0, 2, 2]);
  });

  it("suma dentro de la misma semana", () => {
    const r = construirCurvaHoras(
      [],
      [
        { fecha: d("2026-08-03"), horas: 1.25 },
        { fecha: d("2026-08-06"), horas: 2.5 },
      ],
    );
    expect(r.semanas).toEqual(["03/08"]);
    expect(r.reales).toEqual([3.75]);
  });

  it("redondea a dos decimales para no arrastrar error de punto flotante", () => {
    const r = construirCurvaHoras(
      [],
      [
        { fecha: d("2026-08-03"), horas: 0.1 },
        { fecha: d("2026-08-04"), horas: 0.2 },
      ],
    );
    expect(r.reales).toEqual([0.3]);
  });
});
