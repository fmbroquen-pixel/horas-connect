import { afterEach, describe, expect, it, vi } from "vitest";
import { esMesActual, mesAnterior, rangoDelMes } from "./mes";

// La regla del período, con el 24/08/2026 como "hoy" (el ejemplo del pedido).
const HOY = "2026-08-24";

describe("rangoDelMes", () => {
  it("el mes en curso también va completo", () => {
    // La regla es una sola para las cuatro pantallas que filtran por mes: del
    // 1 al último día. Antes el mes en curso se cortaba en hoy y eso dejaba
    // dos ventanas distintas conviviendo, con el KPI del plan creciendo solo
    // con el correr de los días.
    expect(rangoDelMes(2026, 8)).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
  });

  it("los meses anteriores van completos", () => {
    expect(rangoDelMes(2026, 7)).toEqual({
      desde: "2026-07-01",
      hasta: "2026-07-31",
    });
    expect(rangoDelMes(2026, 6)).toEqual({
      desde: "2026-06-01",
      hasta: "2026-06-30",
    });
  });

  it("no hay tope hacia atrás: se puede pedir cualquier mes viejo", () => {
    // Lo que reemplaza a la ventana de 45 días.
    expect(rangoDelMes(2024, 2)).toEqual({
      desde: "2024-02-01",
      hasta: "2024-02-29", // bisiesto
    });
  });

  it("febrero no bisiesto termina el 28", () => {
    expect(rangoDelMes(2025, 2).hasta).toBe("2025-02-28");
  });

  it("un mes futuro devuelve su mes entero", () => {
    // No se navega hacia adelante -la flecha está deshabilitada- pero la URL
    // es una entrada pública. Devuelve el mes pedido y la pantalla sale
    // vacía, que es la respuesta honesta a preguntar por un mes que no pasó.
    expect(rangoDelMes(2026, 12)).toEqual({
      desde: "2026-12-01",
      hasta: "2026-12-31",
    });
  });
});

describe("esMesActual", () => {
  afterEach(() => vi.useRealTimers());

  // Se congela el reloj al mediodía local para que el día no dependa del huso
  // de la máquina que corre los tests.
  const congelar = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${iso}T12:00:00`));
  };

  it("el mes en curso es el actual", () => {
    congelar(HOY);
    expect(esMesActual({ anio: 2026, mes: 8 })).toBe(true);
  });

  it("el mes anterior no lo es", () => {
    congelar(HOY);
    expect(esMesActual(mesAnterior({ anio: 2026, mes: 8 }))).toBe(false);
  });

  it("el mismo número de mes de otro año tampoco", () => {
    // Si solo se comparara el mes, agosto de 2025 pasaría por actual.
    congelar(HOY);
    expect(esMesActual({ anio: 2025, mes: 8 })).toBe(false);
  });

  it("cruzando el año, diciembre es actual y enero siguiente no", () => {
    congelar("2026-12-31");
    expect(esMesActual({ anio: 2026, mes: 12 })).toBe(true);
    expect(esMesActual({ anio: 2027, mes: 1 })).toBe(false);
  });
});
