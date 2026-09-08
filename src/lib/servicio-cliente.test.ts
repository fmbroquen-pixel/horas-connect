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

  it("cuenta solo los meses completos", () => {
    // Del 8/9 al 5/12 hay 2 meses y monedas, no 3.
    expect(mesesDeServicioRestantes("2026-12-05", HOY)).toBe(2);
    // Del 8/9 al 8/12 hay 3 justos.
    expect(mesesDeServicioRestantes("2026-12-08", HOY)).toBe(3);
    // Un día más ya no agrega un mes.
    expect(mesesDeServicioRestantes("2026-12-09", HOY)).toBe(3);
  });

  it("nunca redondea hacia arriba", () => {
    // Faltan 29 días: es cero meses completos, no uno.
    expect(mesesDeServicioRestantes("2026-10-07", HOY)).toBe(0);
    expect(mesesDeServicioRestantes("2026-10-08", HOY)).toBe(1);
  });

  it("menos de un mes es 0", () => {
    expect(mesesDeServicioRestantes("2026-09-30", HOY)).toBe(0);
    expect(mesesDeServicioRestantes(HOY, HOY)).toBe(0);
  });

  it("un servicio ya vencido es 0 y no un negativo", () => {
    expect(mesesDeServicioRestantes("2026-05-01", HOY)).toBe(0);
    expect(mesesDeServicioRestantes("2024-01-01", HOY)).toBe(0);
  });

  it("cruza el año", () => {
    expect(mesesDeServicioRestantes("2027-03-08", HOY)).toBe(6);
  });

  it("sin fecha de fin no hay número", () => {
    expect(mesesDeServicioRestantes(null, HOY)).toBeNull();
  });

  it("el fin de mes no inventa un mes de más", () => {
    // Del 31/01 al 28/02 hay 28 días, no un mes.
    expect(mesesDeServicioRestantes("2026-02-28", "2026-01-31")).toBe(0);
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
