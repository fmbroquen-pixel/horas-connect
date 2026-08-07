import { describe, expect, it, vi } from "vitest";

// roadmap.ts importa el cliente de Prisma para las funciones de persistencia.
// Acá solo se prueba la parte pura (plantillas y secuenciación), así que se
// reemplaza por un objeto vacío en vez de levantar una conexión.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { PLANTILLA_ONBOARDING, cantidadTrimestres, listasPorDefecto, planificar } =
  await import("./roadmap");
const { fechaDesdeISO, isoDesdeFecha } = await import("./dias-habiles");

const d = fechaDesdeISO;
const iso = isoDesdeFecha;
const plan = (p: { fechaInicio: Date; fechaFin: Date }) => [
  iso(p.fechaInicio),
  iso(p.fechaFin),
];

describe("planificar", () => {
  it("encadena las tareas una detrás de la otra, sin solaparlas", () => {
    // lun 03 ─ 5 días → vie 07 · 1 día → lun 10 · 2 días → mar 11.
    const r = planificar(
      [{ duracionDias: 5 }, { duracionDias: 1 }, { duracionDias: 2 }],
      0,
      d("2026-08-03"),
    );
    expect(r.map(plan)).toEqual([
      ["2026-08-03", "2026-08-07"],
      ["2026-08-10", "2026-08-10"],
      ["2026-08-11", "2026-08-12"],
    ]);
  });

  it("nunca arranca una tarea en fin de semana", () => {
    // vie 07 con 1 día termina el vie; la siguiente salta al lun 10.
    const r = planificar([{ duracionDias: 1 }, { duracionDias: 1 }], 0, d("2026-08-07"));
    expect(r.map(plan)).toEqual([
      ["2026-08-07", "2026-08-07"],
      ["2026-08-10", "2026-08-10"],
    ]);
  });

  it("empuja el arranque si cae en fin de semana", () => {
    const r = planificar([{ duracionDias: 1 }], 0, d("2026-08-09")); // domingo
    expect(r.map(plan)).toEqual([["2026-08-10", "2026-08-10"]]);
  });

  it("desde un índice devuelve solo de ahí en adelante", () => {
    // Es lo que hace que mover una fecha empuje hacia adelante y no toque lo
    // que ya pasó: las tareas anteriores al ancla no entran en el plan.
    const tareas = [{ duracionDias: 5 }, { duracionDias: 2 }, { duracionDias: 1 }];
    const r = planificar(tareas, 1, d("2026-08-17"));
    expect(r).toHaveLength(2);
    expect(r.map(plan)).toEqual([
      ["2026-08-17", "2026-08-18"],
      ["2026-08-19", "2026-08-19"],
    ]);
  });

  it("con una lista vacía no devuelve nada", () => {
    expect(planificar([], 0, d("2026-08-03"))).toEqual([]);
  });
});

describe("cantidadTrimestres", () => {
  it("redondea para arriba", () => {
    expect(cantidadTrimestres(3)).toBe(1);
    expect(cantidadTrimestres(4)).toBe(2);
    expect(cantidadTrimestres(6)).toBe(2);
    // El caso del enunciado: 10 meses son 4 tableros, el último parcial.
    expect(cantidadTrimestres(10)).toBe(4);
    expect(cantidadTrimestres(12)).toBe(4);
  });

  it("sin duración cargada asume un trimestre", () => {
    expect(cantidadTrimestres(null)).toBe(1);
    expect(cantidadTrimestres(0)).toBe(1);
  });
});

describe("listasPorDefecto", () => {
  it("arma Onboarding más un tablero por trimestre", () => {
    expect(listasPorDefecto(6).map((l) => l.nombre)).toEqual([
      "Onboarding",
      "Tablero Q1",
      "Tablero Q2",
    ]);
  });

  it("todas las listas traen tareas", () => {
    for (const lista of listasPorDefecto(10)) {
      expect(lista.tareas.length).toBeGreaterThan(0);
    }
  });
});

describe("plantilla de Onboarding", () => {
  it("deriva la duración en días hábiles de las fechas del Excel", () => {
    // "Kick off cliente" iba del sáb 08/08 al mié 12/08: 3 días hábiles.
    const primera = PLANTILLA_ONBOARDING.tareas[0];
    expect(primera.nombre).toBe("Kick off cliente");
    expect(primera.duracionDias).toBe(3);
    expect(primera.horasEstimadas).toBe(1);
  });

  it("ninguna tarea dura menos de un día", () => {
    for (const t of PLANTILLA_ONBOARDING.tareas) {
      expect(t.duracionDias).toBeGreaterThanOrEqual(1);
    }
  });
});
