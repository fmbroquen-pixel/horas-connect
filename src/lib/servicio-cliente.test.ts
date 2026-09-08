import { describe, expect, it } from "vitest";
import {
  finDeServicioISO,
  mesesDeServicioRestantes,
  nivelDeServicio,
  sumarMesesISO,
} from "./servicio-cliente";

describe("sumarMesesISO", () => {
  it("suma meses", () => {
    expect(sumarMesesISO("2026-01-15", 6)).toBe("2026-07-15");
  });

  it("cruza el año", () => {
    expect(sumarMesesISO("2026-11-10", 3)).toBe("2027-02-10");
  });

  it("ajusta al último día del mes destino cuando el día no existe", () => {
    expect(sumarMesesISO("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMesesISO("2024-01-31", 1)).toBe("2024-02-29"); // bisiesto
    expect(sumarMesesISO("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("rechaza una fecha que no es ISO", () => {
    expect(sumarMesesISO("15/01/2026", 6)).toBeNull();
  });
});

describe("finDeServicioISO", () => {
  it("es inicio + duración", () => {
    expect(finDeServicioISO("2026-03-01", 12)).toBe("2027-03-01");
  });

  it("sin alguno de los dos datos no hay fecha de fin", () => {
    // Null no es cero: es "no se sabe". Quien lo muestre tiene que decir eso.
    expect(finDeServicioISO(null, 12)).toBeNull();
    expect(finDeServicioISO("2026-03-01", null)).toBeNull();
    expect(finDeServicioISO("2026-03-01", 0)).toBeNull();
  });
});

describe("mesesDeServicioRestantes", () => {
  const HOY = "2026-09-08";

  it("cuenta meses de calendario, no de 30 días", () => {
    // El caso del pedido: del 8/9 al 1/12 son 3 -septiembre, octubre,
    // noviembre, diciembre-, aunque no lleguen a tres meses completos.
    expect(mesesDeServicioRestantes("2026-12-01", HOY)).toBe(3);
  });

  it("el día no mueve el número", () => {
    // Los tres caen en diciembre, así que los tres dan 3.
    expect(mesesDeServicioRestantes("2026-12-01", HOY)).toBe(3);
    expect(mesesDeServicioRestantes("2026-12-08", HOY)).toBe(3);
    expect(mesesDeServicioRestantes("2026-12-31", HOY)).toBe(3);
  });

  it("dentro del mismo mes es 0", () => {
    expect(mesesDeServicioRestantes("2026-09-30", HOY)).toBe(0);
    expect(mesesDeServicioRestantes("2026-09-09", HOY)).toBe(0);
  });

  it("el mes que viene es 1, sea qué día sea", () => {
    expect(mesesDeServicioRestantes("2026-10-01", HOY)).toBe(1);
    expect(mesesDeServicioRestantes("2026-10-31", HOY)).toBe(1);
  });

  it("una fecha de fin ya pasada es 0, no un negativo", () => {
    expect(mesesDeServicioRestantes(HOY, HOY)).toBe(0);
    expect(mesesDeServicioRestantes("2026-09-07", HOY)).toBe(0);
    expect(mesesDeServicioRestantes("2026-08-31", HOY)).toBe(0);
    expect(mesesDeServicioRestantes("2024-01-01", HOY)).toBe(0);
  });

  // ── Cambio de año ────────────────────────────────────────────────────────
  it("cruza el año", () => {
    expect(mesesDeServicioRestantes("2027-01-01", HOY)).toBe(4);
    expect(mesesDeServicioRestantes("2027-09-08", HOY)).toBe(12);
    expect(mesesDeServicioRestantes("2028-03-01", HOY)).toBe(18);
  });

  it("de diciembre a enero es 1", () => {
    expect(mesesDeServicioRestantes("2027-01-01", "2026-12-31")).toBe(1);
    expect(mesesDeServicioRestantes("2027-01-31", "2026-12-01")).toBe(1);
  });

  it("de enero para atrás, a diciembre del año anterior, es 0", () => {
    expect(mesesDeServicioRestantes("2026-12-31", "2027-01-01")).toBe(0);
  });

  // ── Límites de mes ───────────────────────────────────────────────────────
  it("del último día de un mes al primero del siguiente es 1", () => {
    expect(mesesDeServicioRestantes("2026-10-01", "2026-09-30")).toBe(1);
  });

  it("del primero al último día del mismo mes es 0", () => {
    expect(mesesDeServicioRestantes("2026-09-30", "2026-09-01")).toBe(0);
  });

  it("febrero no es un caso especial", () => {
    expect(mesesDeServicioRestantes("2026-03-01", "2026-02-28")).toBe(1);
    expect(mesesDeServicioRestantes("2024-02-29", "2024-01-31")).toBe(1); // bisiesto
  });

  it("sin fecha de fin, o con una fecha que no es ISO, no hay número", () => {
    expect(mesesDeServicioRestantes(null, HOY)).toBeNull();
    expect(mesesDeServicioRestantes("01/12/2026", HOY)).toBeNull();
    expect(mesesDeServicioRestantes("2026-12-01", "hoy")).toBeNull();
  });
});

describe("nivelDeServicio", () => {
  it("tres o más es verde", () => {
    expect(nivelDeServicio(3)).toBe("verde");
    expect(nivelDeServicio(24)).toBe("verde");
  });

  it("dos es amarillo", () => {
    expect(nivelDeServicio(2)).toBe("amarillo");
  });

  it("uno o menos es rojo", () => {
    expect(nivelDeServicio(1)).toBe("rojo");
    expect(nivelDeServicio(0)).toBe("rojo");
  });
});
