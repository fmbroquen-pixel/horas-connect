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

// ── Grupos armados a mano ──────────────────────────────────────────────────
//
// Dos tareas puestas deliberadamente sobre la misma fecha o la misma semana
// dejan de repartirse en semanas distintas cada vez que se toca una tarea
// anterior. planificar() nunca produce una superposición, así que una guardada
// solo pudo haberla creado una persona: el dato ya dice la intención.
describe("planificar con grupos manuales", () => {
  // Lunes 06/07, lunes 13/07, lunes 20/07 de 2026 (todos días hábiles).
  const conFechas = (
    duracionDias: number,
    inicio: string,
    fin: string,
  ) => ({ duracionDias, fechaInicio: d(inicio), fechaFin: d(fin) });

  it("dos tareas en la misma fecha se mueven juntas", () => {
    // T2 y T3 fueron puestas las dos el 15/07. Al mover T1, las dos se
    // desplazan y siguen empezando el mismo día.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"), // T1
      conFechas(1, "2026-07-15", "2026-07-15"), // T2  ┐ grupo
      conFechas(1, "2026-07-15", "2026-07-15"), // T3  ┘
    ];
    const r = planificar(tareas, 0, d("2026-07-13"));
    expect(iso(r[0].fechaInicio)).toBe("2026-07-13"); // T1 donde se la puso
    expect(iso(r[1].fechaInicio)).toBe("2026-07-14"); // T2 encadena
    expect(iso(r[2].fechaInicio)).toBe("2026-07-14"); // T3 la acompaña
  });

  it("conserva la separación dentro del grupo, no solo la coincidencia", () => {
    // T2 el lunes y T3 el miércoles de la misma semana: dos días hábiles de
    // separación que tienen que sobrevivir al desplazamiento.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(3, "2026-07-13", "2026-07-15"), // lun a mié
      conFechas(1, "2026-07-15", "2026-07-15"), // mié, dentro de T2
    ];
    const r = planificar(tareas, 0, d("2026-07-07"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-08");
    // Dos días hábiles después del inicio nuevo de T2, como antes.
    expect(iso(r[2].fechaInicio)).toBe("2026-07-10");
  });

  it("sin superposición sigue encadenando, como siempre", () => {
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(1, "2026-07-07", "2026-07-07"),
      conFechas(1, "2026-07-08", "2026-07-08"),
    ];
    const r = planificar(tareas, 0, d("2026-07-13"));
    expect(iso(r[0].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[1].fechaInicio)).toBe("2026-07-14");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-15");
  });

  it("la tarea que sigue arranca después del fin MÁS TARDÍO del grupo", () => {
    // T2 dura una semana y T3 un día, las dos arrancan juntas. Encadenar T4
    // contra T3 -la última en orden- la dejaría empezando encima de T2, que
    // sigue abierta. Es el caso que rompe la secuencia si se lo ignora.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(5, "2026-07-13", "2026-07-17"), // ┐ grupo, T2 dura 5 días
      conFechas(1, "2026-07-13", "2026-07-13"), // ┘ T3 dura 1
      conFechas(1, "2026-07-20", "2026-07-20"), // T4
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-07"); // T2
    expect(iso(r[1].fechaFin)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-07"); // T3 junto a T2
    // T4 después del 13, no después del 7.
    expect(iso(r[3].fechaInicio)).toBe("2026-07-14");
  });

  it("un grupo de tres se mueve entero", () => {
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(1, "2026-07-15", "2026-07-15"),
      conFechas(1, "2026-07-15", "2026-07-15"),
      conFechas(1, "2026-07-15", "2026-07-15"),
    ];
    const r = planificar(tareas, 0, d("2026-07-20"));
    expect(r.slice(1).map((x) => iso(x.fechaInicio))).toEqual([
      "2026-07-21",
      "2026-07-21",
      "2026-07-21",
    ]);
  });

  it("no altera las tareas anteriores al ancla", () => {
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(1, "2026-07-15", "2026-07-15"),
      conFechas(1, "2026-07-15", "2026-07-15"),
    ];
    // Ancla en la 2: solo devuelve de ahí en adelante.
    const r = planificar(tareas, 1, d("2026-07-20"));
    expect(r).toHaveLength(2);
    expect(iso(r[0].fechaInicio)).toBe("2026-07-20");
    expect(iso(r[1].fechaInicio)).toBe("2026-07-20"); // sigue agrupada
  });

  it("el grupo salta el fin de semana en vez de caer en sábado", () => {
    // El viernes 17/07 + 1 día hábil de separación cae el lunes 20, no el 18.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(2, "2026-07-16", "2026-07-17"), // jue a vie
      conFechas(1, "2026-07-17", "2026-07-17"), // vie, dentro de la anterior
    ];
    const r = planificar(tareas, 0, d("2026-07-16"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-17"); // vie
    // Un hábil después del viernes es el lunes.
    expect(iso(r[2].fechaInicio)).toBe("2026-07-20");
  });

  it("sin fechas cargadas planifica como siempre (sembrado inicial)", () => {
    // Las plantillas no traen fechas: no hay grupos que preservar.
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

  it("una tarea que arranca antes que la anterior se toma como simultánea", () => {
    // Orden de secuencia y orden de fechas no coinciden: se las trata como
    // empezando juntas en vez de inventar una separación negativa, que
    // empujaría al grupo hacia atrás en cada recálculo.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(3, "2026-07-15", "2026-07-17"),
      conFechas(1, "2026-07-14", "2026-07-14"), // antes que la anterior
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-07");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-07");
  });
});

describe("planificar: grupos y reordenamiento", () => {
  const conFechas = (duracionDias: number, inicio: string, fin: string) => ({
    duracionDias,
    fechaInicio: d(inicio),
    fechaFin: d(fin),
  });

  it("no arma grupo entre tareas que quedaron juntas recién al reordenar", () => {
    // El caso que rompía: una tarea de octubre movida al medio de julio. La de
    // julio que queda detrás se superpone con sus fechas VIEJAS, pero eso no
    // dice nada sobre el orden nuevo: nadie las agrupó.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"), // julio
      conFechas(1, "2026-10-05", "2026-10-05"), // la traída de octubre
      conFechas(1, "2026-07-07", "2026-07-07"), // julio, "dentro" de la de octubre
    ];
    // Sin el filtro, la tercera se plantaría encima de la segunda.
    const sinFiltro = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(sinFiltro[2].fechaInicio)).toBe(iso(sinFiltro[1].fechaInicio));

    // Con el filtro -la tercera cambió de anterior- vuelve a encadenar.
    const r = planificar(tareas, 0, d("2026-07-06"), [true, true, false]);
    expect(iso(r[1].fechaInicio)).toBe("2026-07-07");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-08");
  });

  it("un grupo que se reordena entero se conserva", () => {
    // Las dos siguen siendo vecinas después de reordenar: el grupo vale.
    const tareas = [
      conFechas(1, "2026-07-06", "2026-07-06"),
      conFechas(1, "2026-07-15", "2026-07-15"),
      conFechas(1, "2026-07-15", "2026-07-15"),
    ];
    const r = planificar(tareas, 0, d("2026-07-20"), [true, true, true]);
    expect(iso(r[1].fechaInicio)).toBe("2026-07-21");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-21");
  });
});
