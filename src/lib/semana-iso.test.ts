import { describe, expect, it } from "vitest";
import {
  lunesDeISO,
  mismaSemanaISO,
  siguienteHabilISO,
  viernesDeISO,
} from "./semana-iso";

// Julio de 2026: lun 06 · lun 13 · lun 20 · lun 27
describe("lunesDeISO", () => {
  it("devuelve el lunes de la semana", () => {
    expect(lunesDeISO("2026-07-22")).toBe("2026-07-20"); // miércoles
    expect(lunesDeISO("2026-07-20")).toBe("2026-07-20"); // el propio lunes
    expect(lunesDeISO("2026-07-24")).toBe("2026-07-20"); // viernes
  });

  it("un fin de semana pertenece a la semana SIGUIENTE", () => {
    // La que termina ya cerró: nadie planifica trabajo para ella.
    expect(lunesDeISO("2026-07-25")).toBe("2026-07-27"); // sábado
    expect(lunesDeISO("2026-07-26")).toBe("2026-07-27"); // domingo
  });

  it("cruza el mes y el año", () => {
    expect(lunesDeISO("2026-08-01")).toBe("2026-08-03"); // sábado 01/08
    expect(lunesDeISO("2027-01-01")).toBe("2026-12-28"); // viernes
  });

  it("una fecha que no es ISO no devuelve nada", () => {
    expect(lunesDeISO("22/07/2026")).toBeNull();
  });
});

describe("viernesDeISO", () => {
  it("es el lunes de esa semana más cuatro", () => {
    expect(viernesDeISO("2026-07-22")).toBe("2026-07-24");
    expect(viernesDeISO("2026-07-20")).toBe("2026-07-24");
  });

  it("cruza el año", () => {
    expect(viernesDeISO("2026-12-30")).toBe("2027-01-01");
  });
});

describe("siguienteHabilISO", () => {
  it("un día hábil se queda donde está", () => {
    expect(siguienteHabilISO("2026-07-22")).toBe("2026-07-22");
  });

  it("un fin de semana salta al lunes", () => {
    expect(siguienteHabilISO("2026-07-25")).toBe("2026-07-27");
    expect(siguienteHabilISO("2026-07-26")).toBe("2026-07-27");
  });
});

describe("mismaSemanaISO", () => {
  it("de lunes a viernes es la misma semana", () => {
    expect(mismaSemanaISO("2026-07-20", "2026-07-24")).toBe(true);
    expect(mismaSemanaISO("2026-07-21", "2026-07-22")).toBe(true);
  });

  it("el viernes y el lunes siguiente NO son la misma", () => {
    // Es exactamente lo que bloquea la confirmación de un grupo.
    expect(mismaSemanaISO("2026-07-24", "2026-07-27")).toBe(false);
  });

  it("cruzando el año, dos días de la misma semana siguen siéndolo", () => {
    // Lunes 28/12/2026 y viernes 01/01/2027.
    expect(mismaSemanaISO("2026-12-28", "2027-01-01")).toBe(true);
    expect(mismaSemanaISO("2027-01-01", "2027-01-04")).toBe(false);
  });

  it("una fecha inválida nunca coincide", () => {
    expect(mismaSemanaISO("nope", "2026-07-20")).toBe(false);
  });
});
