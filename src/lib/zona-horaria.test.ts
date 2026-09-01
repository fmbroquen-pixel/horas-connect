import { describe, expect, it } from "vitest";
import { hoyISO, hoyUTC, mesActual, partesEnZona } from "./zona-horaria";

// El caso que rompía: 21:49 del 31/08 en Mendoza son las 00:49 del 01/09 UTC.
const NOCHE_31_AGOSTO = new Date("2026-09-01T00:49:00Z");
// Un minuto antes de la medianoche argentina: 02:59 UTC del 01/09.
const CASI_MEDIANOCHE = new Date("2026-09-01T02:59:00Z");
// La medianoche argentina exacta: 03:00 UTC.
const MEDIANOCHE = new Date("2026-09-01T03:00:00Z");

describe("hoyISO", () => {
  it("a las 21:49 del 31/08 en Argentina sigue siendo el 31/08", () => {
    expect(hoyISO(NOCHE_31_AGOSTO)).toBe("2026-08-31");
  });

  it("un minuto antes de la medianoche argentina sigue siendo agosto", () => {
    expect(hoyISO(CASI_MEDIANOCHE)).toBe("2026-08-31");
  });

  it("recién a las 00:00 de Argentina pasa a septiembre", () => {
    expect(hoyISO(MEDIANOCHE)).toBe("2026-09-01");
  });

  it("al mediodia no hay diferencia con UTC", () => {
    expect(hoyISO(new Date("2026-08-31T15:00:00Z"))).toBe("2026-08-31");
  });
});

describe("mesActual", () => {
  it("a las 21:49 del 31/08 el mes en curso es agosto", () => {
    // Es el bug tal como se veia: el selector mensual mostraba SEPTIEMBRE.
    expect(mesActual(NOCHE_31_AGOSTO)).toEqual({ anio: 2026, mes: 8 });
  });

  it("cambia de mes con el reloj argentino, no con el UTC", () => {
    expect(mesActual(CASI_MEDIANOCHE)).toEqual({ anio: 2026, mes: 8 });
    expect(mesActual(MEDIANOCHE)).toEqual({ anio: 2026, mes: 9 });
  });

  it("cruza el año igual que cruza el mes", () => {
    // 31/12 a las 22:00 en Argentina = 01/01 a las 01:00 UTC.
    expect(mesActual(new Date("2027-01-01T01:00:00Z"))).toEqual({
      anio: 2026,
      mes: 12,
    });
  });
});

describe("hoyUTC", () => {
  it("devuelve el dia argentino a medianoche UTC", () => {
    // Medianoche UTC y no las 03:00: asi estan guardadas las columnas @db.Date,
    // que es contra lo que se compara.
    expect(hoyUTC(NOCHE_31_AGOSTO).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("no deja cargar como pasado un dia que en Argentina es futuro", () => {
    // La validacion "no se pueden cargar horas futuras" compara contra esto.
    // Con el calculo viejo, a las 21:49 del 31/08 el 01/09 pasaba por valido.
    const primeroDeSeptiembre = new Date(Date.UTC(2026, 8, 1));
    expect(primeroDeSeptiembre > hoyUTC(NOCHE_31_AGOSTO)).toBe(true);
  });
});

describe("partesEnZona", () => {
  it("da la hora argentina, no la UTC", () => {
    expect(partesEnZona(NOCHE_31_AGOSTO)).toEqual({
      anio: 2026,
      mes: 8,
      dia: 31,
      hora: 21,
      minuto: 49,
    });
  });

  it("la medianoche es hora 0 y no hora 24", () => {
    expect(partesEnZona(MEDIANOCHE).hora).toBe(0);
  });
});
