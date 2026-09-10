import { describe, expect, it, vi } from "vitest";

// roadmap.ts importa el cliente de Prisma para las funciones de persistencia.
// Acá solo se prueba la parte pura (plantillas y secuenciación), así que se
// reemplaza por un objeto vacío en vez de levantar una conexión.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const {
  PLANTILLA_ONBOARDING,
  cantidadTrimestres,
  etiquetaDeEtapa,
  listasPorDefecto,
  planificar,
} = await import("./roadmap");
const { fechaDesdeISO, isoDesdeFecha } = await import("./dias-habiles");

const d = fechaDesdeISO;
const iso = isoDesdeFecha;
const plan = (p: { fechaInicio: Date; fechaFin: Date }) => [
  iso(p.fechaInicio),
  iso(p.fechaFin),
];
// Tareas sin fechas ni grupo: es lo que ve el scheduler al sembrar una
// plantilla. Solo importa cuántas son.
const vacias = (n: number) => Array.from({ length: n }, () => ({}));

// Julio y agosto de 2026 en semanas, para leer los tests sin calendario al
// lado:  lun 06/07 · lun 13/07 · lun 20/07 · lun 27/07 · lun 03/08 · lun 10/08
describe("planificar · una tarea, una semana", () => {
  it("cada tarea ocupa de lunes a viernes y la siguiente arranca el lunes que viene", () => {
    const r = planificar(vacias(3), 0, d("2026-07-06"));
    expect(r.map(plan)).toEqual([
      ["2026-07-06", "2026-07-10"],
      ["2026-07-13", "2026-07-17"],
      ["2026-07-20", "2026-07-24"],
    ]);
  });

  it("un arranque a mitad de semana ocupa esa semana desde su lunes", () => {
    // El plan arranca el miércoles: la primera tarea igual toma la semana
    // completa. Nadie planifica media semana de trabajo.
    const r = planificar(vacias(2), 0, d("2026-07-08"));
    expect(r.map(plan)).toEqual([
      ["2026-07-06", "2026-07-10"],
      ["2026-07-13", "2026-07-17"],
    ]);
  });

  it("un arranque en fin de semana cae en la semana siguiente", () => {
    // Sábado 11 y domingo 12 pertenecen a la semana que arranca el lunes 13:
    // la que termina ya cerró.
    expect(plan(planificar(vacias(1), 0, d("2026-07-11"))[0])).toEqual([
      "2026-07-13",
      "2026-07-17",
    ]);
    expect(plan(planificar(vacias(1), 0, d("2026-07-12"))[0])).toEqual([
      "2026-07-13",
      "2026-07-17",
    ]);
  });

  it("la duración que devuelve es la semana hábil", () => {
    expect(planificar(vacias(1), 0, d("2026-07-06"))[0].duracionDias).toBe(5);
  });

  it("nunca vuelve la regla de 'fin anterior + 1 día hábil'", () => {
    // Con la regla vieja, tres tareas de un día entraban en la misma semana.
    // Ahora ocupan tres semanas, que es el ritmo real de trabajo.
    const r = planificar(vacias(3), 0, d("2026-07-06"));
    const inicios = r.map((x) => iso(x.fechaInicio));
    expect(new Set(inicios).size).toBe(3);
    for (const [i, x] of r.entries()) {
      // Lunes a viernes, siempre.
      expect(x.fechaInicio.getUTCDay()).toBe(1);
      expect(x.fechaFin.getUTCDay()).toBe(5);
      if (i > 0) {
        const semanas =
          (x.fechaInicio.getTime() - r[i - 1].fechaInicio.getTime()) /
          (7 * 24 * 3600 * 1000);
        expect(semanas).toBe(1);
      }
    }
  });

  it("cruza el fin de año", () => {
    const r = planificar(vacias(3), 0, d("2026-12-21"));
    expect(r.map(plan)).toEqual([
      ["2026-12-21", "2026-12-25"],
      ["2026-12-28", "2027-01-01"],
      ["2027-01-04", "2027-01-08"],
    ]);
  });

  it("desde un índice devuelve solo de ahí en adelante", () => {
    // Es lo que hace que mover una fecha empuje hacia adelante y no toque lo
    // que ya pasó: las tareas anteriores al ancla no entran en el plan.
    const r = planificar(vacias(3), 1, d("2026-07-13"));
    expect(r).toHaveLength(2);
    expect(r.map(plan)).toEqual([
      ["2026-07-13", "2026-07-17"],
      ["2026-07-20", "2026-07-24"],
    ]);
  });

  it("con una lista vacía no devuelve nada", () => {
    expect(planificar([], 0, d("2026-07-06"))).toEqual([]);
  });
});

// ── El ancla del calendario ────────────────────────────────────────────────
//
// Cuando alguien mueve una tarea con el date picker, esa fecha es una decisión
// y no un cálculo: se respeta tal cual, aunque no sea un lunes o aunque la
// tarea dure tres días. Lo que se recalcula es lo que viene DESPUÉS.
describe("planificar · ancla conservada", () => {
  const t = (inicio: string, fin: string, grupoId?: string) => ({
    fechaInicio: d(inicio),
    fechaFin: d(fin),
    grupoId,
  });

  it("respeta la fecha elegida y encadena desde la semana siguiente", () => {
    const tareas = [t("2026-07-06", "2026-07-10"), t("2026-07-13", "2026-07-17")];
    const r = planificar(tareas, 0, d("2026-07-08"), { conservarAncla: true });
    // El ancla queda con el miércoles que eligió la persona.
    expect(plan(r[0])).toEqual(["2026-07-06", "2026-07-10"]);
    expect(plan(r[1])).toEqual(["2026-07-13", "2026-07-17"]);
  });

  it("una tarea corrida a mitad de semana no arrastra a la siguiente fuera de su semana", () => {
    // El ancla pasa a mié-jue de la semana del 13. La siguiente toma la
    // semana del 20, no "el día hábil posterior al fin".
    const tareas = [t("2026-07-15", "2026-07-16"), t("2026-07-13", "2026-07-17")];
    const r = planificar(tareas, 0, d("2026-07-15"), { conservarAncla: true });
    expect(plan(r[0])).toEqual(["2026-07-15", "2026-07-16"]);
    expect(plan(r[1])).toEqual(["2026-07-20", "2026-07-24"]);
  });

  it("sin conservarAncla el ancla se normaliza a su semana", () => {
    const tareas = [t("2026-07-15", "2026-07-16"), t("2026-07-13", "2026-07-17")];
    const r = planificar(tareas, 0, d("2026-07-15"));
    expect(plan(r[0])).toEqual(["2026-07-13", "2026-07-17"]);
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

describe("etiquetaDeEtapa", () => {
  it("saca el prefijo Tablero que pone listasPorDefecto", () => {
    expect(etiquetaDeEtapa("Tablero Q3", "Primera Mensual")).toBe(
      "Q3 · Primera Mensual",
    );
  });

  it("deja intacta una lista que no lo lleva", () => {
    expect(etiquetaDeEtapa("Onboarding", "Kickoff")).toBe("Onboarding · Kickoff");
  });

  it("no toca un nombre que apenas contiene la palabra", () => {
    expect(etiquetaDeEtapa("Pre Tablero", "Kickoff")).toBe("Pre Tablero · Kickoff");
  });

  it("conserva el nombre si sacarlo lo dejaría vacío", () => {
    expect(etiquetaDeEtapa("Tablero", "Kickoff")).toBe("Tablero · Kickoff");
  });
});

describe("plantilla de Onboarding", () => {
  it("trae nombre y horas, sin duración", () => {
    // La duración se fue: toda tarea ocupa una semana, así que no hay nada
    // que derivar de las fechas que traía el Excel.
    const primera = PLANTILLA_ONBOARDING.tareas[0];
    expect(primera.nombre).toBe("Kick off cliente");
    expect(primera.horasEstimadas).toBe(1);
    expect(primera).not.toHaveProperty("duracionDias");
  });

  it("una plantilla de N tareas ocupa N semanas seguidas", () => {
    const tareas = PLANTILLA_ONBOARDING.tareas;
    const r = planificar(vacias(tareas.length), 0, d("2026-07-06"));
    expect(r).toHaveLength(tareas.length);
    expect(plan(r[0])).toEqual(["2026-07-06", "2026-07-10"]);
    expect(plan(r[tareas.length - 1])[0]).toBe(
      iso(new Date(d("2026-07-06").getTime() + (tareas.length - 1) * 7 * 86400000)),
    );
  });
});

// ── Grupos explícitos ──────────────────────────────────────────────────────
//
// Un grupo existe porque alguien lo creó desde la barra de selección, no
// porque dos tareas hayan quedado en la misma semana. Coincidir no agrupa: ni
// arrastrando, ni desde el calendario, ni por un recálculo.
describe("planificar con grupos explícitos", () => {
  const t = (inicio: string, fin: string, grupoId?: string) => ({
    fechaInicio: d(inicio),
    fechaFin: d(fin),
    grupoId,
  });

  it("las tareas de un grupo comparten semana", () => {
    const tareas = [
      t("2026-07-06", "2026-07-10"), // T1 suelta
      t("2026-07-20", "2026-07-24", "g1"), // T2 ┐ grupo, misma semana
      t("2026-07-20", "2026-07-24", "g1"), // T3 ┘
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-13"); // acompaña
  });

  it("MISMA semana sin grupo son tareas independientes", () => {
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-07-20", "2026-07-24"),
      t("2026-07-20", "2026-07-24"), // misma semana, sin grupoId
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-20"); // encadena, no acompaña
  });

  it("conserva la separación EN SEMANAS dentro del grupo", () => {
    // Agrupadas con dos semanas de separación: eso es su relación temporal y
    // es lo que tiene que sobrevivir al desplazamiento.
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-07-20", "2026-07-24", "g1"),
      t("2026-08-03", "2026-08-07", "g1"), // dos semanas después
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-27"); // conserva las dos
  });

  it("la tarea que sigue arranca después de la semana MÁS TARDÍA del grupo", () => {
    // El segundo miembro va dos semanas más adelante que el primero.
    // Encadenar la siguiente contra el último en ORDEN la dejaría encima.
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-08-03", "2026-08-07", "g1"), // más tardío
      t("2026-07-20", "2026-07-24", "g1"), // anterior, pero va después en orden
      t("2026-08-10", "2026-08-14"),
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-13"); // no retrocede
    expect(iso(r[3].fechaInicio)).toBe("2026-07-20");
  });

  it("el grupo aguanta que le metan una tarea suelta en el medio", () => {
    // Cada miembro se ancla al PRIMERO del grupo, no a su vecino.
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-07-20", "2026-07-24", "g1"), // miembro
      t("2026-08-10", "2026-08-14"), // suelta, en el medio
      t("2026-07-20", "2026-07-24", "g1"), // miembro
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-13"); // primer miembro
    expect(iso(r[2].fechaInicio)).toBe("2026-07-20"); // la suelta encadena
    expect(iso(r[3].fechaInicio)).toBe("2026-07-13"); // vuelve con su grupo
  });

  it("dos grupos distintos no se mezclan", () => {
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-07-20", "2026-07-24", "g1"),
      t("2026-07-20", "2026-07-24", "g1"),
      t("2026-08-03", "2026-08-07", "g2"),
      t("2026-08-03", "2026-08-07", "g2"),
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe(iso(r[2].fechaInicio));
    expect(iso(r[3].fechaInicio)).toBe(iso(r[4].fechaInicio));
    expect(iso(r[3].fechaInicio)).not.toBe(iso(r[1].fechaInicio));
  });

  it("un grupo que empieza antes del ancla sigue mandando", () => {
    // El primer miembro quedó fuera del recálculo: su semana actual es el
    // punto de referencia para los que sí se replanifican.
    const tareas = [
      t("2026-07-06", "2026-07-10", "g1"), // fuera del recálculo
      t("2026-07-20", "2026-07-24", "g1"), // dos semanas después
    ];
    const r = planificar(tareas, 1, d("2026-07-20"));
    expect(r).toHaveLength(1);
    expect(iso(r[0].fechaInicio)).toBe("2026-07-20");
  });
});

// ── El rango de un grupo viaja con él ──────────────────────────────────────
//
// Agrupar es decidir que dos tareas van juntas Y cuándo: comparten un inicio y
// un fin dentro de una misma semana. Ese tramo es una decisión de una persona,
// así que el scheduler lo lleva consigo al desplazar el grupo en vez de
// devolverlo a lunes-viernes.
describe("planificar · el tramo de un grupo se conserva", () => {
  const t = (inicio: string, fin: string, grupoId?: string) => ({
    fechaInicio: d(inicio),
    fechaFin: d(fin),
    grupoId,
  });

  it("un grupo de martes a miércoles sigue siendo martes a miércoles al moverse", () => {
    const tareas = [
      t("2026-07-06", "2026-07-10"), // suelta, se recalcula a la semana del 06
      t("2026-07-21", "2026-07-22", "g1"), // mar-mié de la semana del 20
      t("2026-07-21", "2026-07-22", "g1"),
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    // El grupo baja a la semana del 13: martes 14 y miércoles 15.
    expect(plan(r[1])).toEqual(["2026-07-14", "2026-07-15"]);
    expect(plan(r[2])).toEqual(["2026-07-14", "2026-07-15"]);
    expect(r[1].duracionDias).toBe(2);
  });

  it("una tarea SUELTA no conserva su tramo: vuelve a la semana entera", () => {
    // La diferencia es el grupo. Sin él, la regla base manda.
    const r = planificar([t("2026-07-21", "2026-07-22")], 0, d("2026-07-13"));
    expect(plan(r[0])).toEqual(["2026-07-13", "2026-07-17"]);
    expect(r[0].duracionDias).toBe(5);
  });

  it("el grupo ocupa UNA semana y la siguiente arranca la posterior", () => {
    // Es lo que hace que agrupar sirva: dos tareas dejan de gastar dos semanas.
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-07-20", "2026-07-24", "g1"),
      t("2026-07-20", "2026-07-24", "g1"),
      t("2026-08-10", "2026-08-14"),
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(iso(r[1].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[2].fechaInicio)).toBe("2026-07-13");
    expect(iso(r[3].fechaInicio)).toBe("2026-07-20"); // no el 27
  });

  it("un grupo de un solo día conserva el día dentro de la semana", () => {
    const tareas = [
      t("2026-07-06", "2026-07-10"),
      t("2026-07-23", "2026-07-23", "g1"), // jueves
      t("2026-07-23", "2026-07-23", "g1"),
    ];
    const r = planificar(tareas, 0, d("2026-07-06"));
    expect(plan(r[1])).toEqual(["2026-07-16", "2026-07-16"]); // jueves de la semana del 13
    expect(r[1].duracionDias).toBe(1);
  });
});
