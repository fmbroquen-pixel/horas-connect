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

// ── Grupos explícitos ──────────────────────────────────────────────────────
//
// Un grupo existe porque alguien lo creó desde la barra de selección, no
// porque dos tareas hayan quedado en la misma fecha. Coincidir no agrupa: ni
// arrastrando, ni desde el calendario, ni por un recálculo.
describe("planificar con grupos explícitos", () => {
  const t = (
    duracionDias: number,
    inicio: string,
    fin: string,
    grupoId?: string,
  ) => ({ duracionDias, fechaInicio: d(inicio), fechaFin: d(fin), grupoId });

  it("las tareas de un grupo se mueven juntas", () => {
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"), // T1 suelta
      t(1, "2026-07-15", "2026-07-15", "g1"), // T2 ┐ grupo
      t(1, "2026-07-15", "2026-07-15", "g1"), // T3 ┘
    ];
    const r = planificar(tareas, 0, d("2026-07-13"));
    expect(iso(r[0].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[1].fechaInicio)).toBe("2026-07-14");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-14"); // acompaña
  });

  it("MISMAS fechas sin grupo son tareas independientes", () => {
    // El cambio de regla: antes esto se leía como grupo por la superposición.
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"),
      t(1, "2026-07-15", "2026-07-15"),
      t(1, "2026-07-15", "2026-07-15"), // misma fecha, sin grupoId
    ];
    const r = planificar(tareas, 0, d("2026-07-13"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-14");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-15"); // encadena, no acompaña
  });

  it("conserva la separación dentro del grupo, no solo la coincidencia", () => {
    // Agrupadas con dos días hábiles de separación: eso es su relación
    // temporal y es lo que tiene que sobrevivir al desplazamiento.
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"),
      t(3, "2026-07-13", "2026-07-15", "g1"),
      t(1, "2026-07-15", "2026-07-15", "g1"),
    ];
    const r = planificar(tareas, 0, d("2026-07-07"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-08");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-10");
  });

  it("la tarea que sigue arranca después del fin MÁS TARDÍO del grupo", () => {
    // T2 dura una semana y T3 un día, agrupadas. Encadenar T4 contra T3 la
    // dejaría empezando encima de T2, que sigue abierta.
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"),
      t(5, "2026-07-13", "2026-07-17", "g1"),
      t(1, "2026-07-13", "2026-07-13", "g1"),
      t(1, "2026-07-20", "2026-07-20"),
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaFin)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-07");
    expect(iso(r[3].fechaInicio)).toBe("2026-07-14");
  });

  it("el grupo aguanta que le metan una tarea suelta en el medio", () => {
    // Cada miembro se ancla al PRIMERO del grupo, no a su vecino: por eso
    // reordenar y dejar algo entre las dos no rompe la relación.
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"),
      t(1, "2026-07-15", "2026-07-15", "g1"), // miembro
      t(1, "2026-07-20", "2026-07-20"), // suelta, en el medio
      t(1, "2026-07-15", "2026-07-15", "g1"), // miembro
    ];
    const r = planificar(tareas, 0, d("2026-07-13"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-14"); // primer miembro
    expect(iso(r[2].fechaInicio)).toBe("2026-07-15"); // la suelta encadena
    expect(iso(r[3].fechaInicio)).toBe("2026-07-14"); // vuelve con su grupo
  });

  it("dos grupos distintos no se mezclan", () => {
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"),
      t(1, "2026-07-13", "2026-07-13", "g1"),
      t(1, "2026-07-13", "2026-07-13", "g1"),
      t(1, "2026-07-20", "2026-07-20", "g2"),
      t(1, "2026-07-20", "2026-07-20", "g2"),
    ];
    const r = planificar(tareas, 0, d("2026-07-07"));
    expect(iso(r[1].fechaInicio)).toBe(iso(r[2].fechaInicio));
    expect(iso(r[3].fechaInicio)).toBe(iso(r[4].fechaInicio));
    expect(iso(r[3].fechaInicio)).not.toBe(iso(r[1].fechaInicio));
  });

  it("un grupo que empieza antes del ancla sigue mandando", () => {
    // El primer miembro quedó fuera del recálculo (antes del ancla): su fecha
    // actual es el punto de referencia para los que sí se replanifican.
    const tareas = [
      t(1, "2026-07-06", "2026-07-06", "g1"), // fuera del recálculo
      t(1, "2026-07-08", "2026-07-08", "g1"), // dos hábiles después
    ];
    const r = planificar(tareas, 1, d("2026-07-08"));
    expect(r).toHaveLength(1);
    expect(iso(r[0].fechaInicio)).toBe("2026-07-08");
  });

  it("el grupo salta el fin de semana", () => {
    const tareas = [
      t(1, "2026-07-06", "2026-07-06"),
      t(2, "2026-07-16", "2026-07-17", "g1"),
      t(1, "2026-07-17", "2026-07-17", "g1"), // un hábil después
    ];
    const r = planificar(tareas, 0, d("2026-07-16"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-17"); // viernes
    expect(iso(r[2].fechaInicio)).toBe("2026-07-20"); // lunes, no sábado
  });

  it("sin fechas cargadas planifica como siempre (sembrado inicial)", () => {
    const r = planificar(
      [{ duracionDias: 2 }, { duracionDias: 1 }, { duracionDias: 1 }],
      0,
      d("2026-07-06"),
    );
    expect(r.map((x) => iso(x.fechaInicio))).toEqual([
      "2026-07-06",
      "2026-07-08",
      "2026-07-09",
    ]);
  });
});
