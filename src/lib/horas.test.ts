import { describe, expect, it } from "vitest";
import {
  escalarHorasPorPersonas,
  formatHorasHsMin,
  parseHorasHsMin,
  reformatEntradaHoras,
} from "./horas";

describe("parseHorasHsMin", () => {
  it("lee el formato hs:min", () => {
    expect(parseHorasHsMin("1:30")).toBe(1.5);
    expect(parseHorasHsMin("0:15")).toBe(0.25);
    expect(parseHorasHsMin("10:00")).toBe(10);
  });

  it("acepta decimales con punto o con coma", () => {
    expect(parseHorasHsMin("2")).toBe(2);
    expect(parseHorasHsMin("2.5")).toBe(2.5);
    expect(parseHorasHsMin("2,5")).toBe(2.5);
  });

  it("ignora los espacios de los costados", () => {
    expect(parseHorasHsMin("  1:30  ")).toBe(1.5);
  });

  it("rechaza minutos que no existen", () => {
    expect(parseHorasHsMin("1:60")).toBeNull();
    expect(parseHorasHsMin("1:99")).toBeNull();
  });

  it("rechaza lo que no es un número de horas", () => {
    expect(parseHorasHsMin("")).toBeNull();
    expect(parseHorasHsMin("abc")).toBeNull();
    expect(parseHorasHsMin("-1")).toBeNull();
    expect(parseHorasHsMin("1:5")).toBeNull(); // minutos sin cero a la izquierda
  });
});

describe("formatHorasHsMin", () => {
  it("muestra el decimal como hs:min", () => {
    expect(formatHorasHsMin(1.5)).toBe("1:30");
    expect(formatHorasHsMin(0)).toBe("0:00");
    expect(formatHorasHsMin(0.25)).toBe("0:15");
    expect(formatHorasHsMin(10)).toBe("10:00");
  });

  it("redondea al minuto", () => {
    // 1/3 de hora son 20 minutos exactos.
    expect(formatHorasHsMin(1 / 3)).toBe("0:20");
    // 0.999 h son 59.94 minutos: redondea a 60 y arrastra a la hora entera,
    // en vez de mostrar un imposible "0:60".
    expect(formatHorasHsMin(0.999)).toBe("1:00");
  });
});

describe("reformatEntradaHoras", () => {
  it("normaliza lo que escribió el usuario", () => {
    expect(reformatEntradaHoras("2,5")).toBe("2:30");
    expect(reformatEntradaHoras("2.5")).toBe("2:30");
    expect(reformatEntradaHoras("1:30")).toBe("1:30");
  });

  it("rechaza fuera del rango de una jornada", () => {
    expect(reformatEntradaHoras("0")).toBeNull();
    expect(reformatEntradaHoras("25")).toBeNull();
    expect(reformatEntradaHoras("basura")).toBeNull();
  });

  it("acepta el borde de 24", () => {
    expect(reformatEntradaHoras("24")).toBe("24:00");
  });
});

describe("ida y vuelta", () => {
  it("formatear y volver a parsear conserva el valor", () => {
    for (const v of [0.25, 0.5, 1, 1.5, 3.75, 8, 24]) {
      expect(parseHorasHsMin(formatHorasHsMin(v))).toBeCloseTo(v, 10);
    }
  });
});

describe("escalarHorasPorPersonas", () => {
  it("sumar una persona duplica las horas", () => {
    expect(escalarHorasPorPersonas(3, 1, 2)).toBe(6);
  });

  it("sacar una persona las parte al medio", () => {
    expect(escalarHorasPorPersonas(6, 2, 1)).toBe(3);
  });

  it("el ejemplo del pedido: editar a mano no rompe la regla", () => {
    // 2 personas / 4h → el usuario edita a 6h → a 1 persona da 3 → volver a 2
    // devuelve las 6. La cuenta se hace sobre el valor actual, no sobre un
    // "original" guardado aparte.
    const editadas = 6;
    const conUna = escalarHorasPorPersonas(editadas, 2, 1);
    expect(conUna).toBe(3);
    expect(escalarHorasPorPersonas(conUna, 1, 2)).toBe(6);
  });

  it("sin cambio de personas no cambia nada", () => {
    expect(escalarHorasPorPersonas(1.5, 2, 2)).toBe(1.5);
  });

  it("cero horas siguen siendo cero", () => {
    // Los hitos entran con 0 de presupuesto y no tienen que inventarse uno.
    expect(escalarHorasPorPersonas(0, 1, 2)).toBe(0);
  });

  it("las medias horas se conservan", () => {
    expect(escalarHorasPorPersonas(1.5, 1, 2)).toBe(3);
    expect(escalarHorasPorPersonas(1.5, 2, 1)).toBe(0.75); // 45 minutos
  });

  it("redondea a dos decimales, que es lo que guarda la columna", () => {
    // 0,25 h son 15 minutos; la mitad son 7,5 y la columna no los tiene.
    expect(escalarHorasPorPersonas(0.25, 2, 1)).toBe(0.13);
  });

  it("una cantidad de personas inválida deja las horas como están", () => {
    expect(escalarHorasPorPersonas(4, 0, 2)).toBe(4);
    expect(escalarHorasPorPersonas(4, 2, 0)).toBe(4);
  });
});
