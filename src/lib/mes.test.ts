import { describe, expect, it } from "vitest";
import { rangoDelMes } from "./mes";

// La regla del período, con el 24/08/2026 como "hoy" (el ejemplo del pedido).
const HOY = "2026-08-24";

describe("rangoDelMes", () => {
  it("el mes en curso se corta en hoy", () => {
    expect(rangoDelMes(2026, 8, HOY)).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-24",
    });
  });

  it("los meses anteriores van completos", () => {
    expect(rangoDelMes(2026, 7, HOY)).toEqual({
      desde: "2026-07-01",
      hasta: "2026-07-31",
    });
    expect(rangoDelMes(2026, 6, HOY)).toEqual({
      desde: "2026-06-01",
      hasta: "2026-06-30",
    });
  });

  it("no hay tope hacia atrás: se puede pedir cualquier mes viejo", () => {
    // Lo que reemplaza a la ventana de 45 días.
    expect(rangoDelMes(2024, 2, HOY)).toEqual({
      desde: "2024-02-01",
      hasta: "2024-02-29", // bisiesto
    });
  });

  it("febrero no bisiesto termina el 28", () => {
    expect(rangoDelMes(2025, 2, HOY).hasta).toBe("2025-02-28");
  });

  it("un mes futuro no puede pasar de hoy", () => {
    // No se navega hacia adelante, pero la URL es una entrada pública.
    expect(rangoDelMes(2026, 12, HOY).hasta).toBe(HOY);
  });
});
