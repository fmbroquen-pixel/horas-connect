import { describe, expect, it } from "vitest";
import {
  diasHabilesEntre,
  esDiaHabil,
  fechaDesdeISO,
  finTrasDiasHabiles,
  isoDesdeFecha,
  siguienteDiaHabil,
} from "./dias-habiles";

// Fechas ancla usadas en todo el archivo (agosto 2026):
//   lun 03 · vie 07 · sáb 08 · dom 09 · lun 10 · vie 14 · lun 17
const d = fechaDesdeISO;
const iso = isoDesdeFecha;

describe("esDiaHabil", () => {
  it("cuenta de lunes a viernes", () => {
    expect(esDiaHabil(d("2026-08-03"))).toBe(true); // lunes
    expect(esDiaHabil(d("2026-08-07"))).toBe(true); // viernes
  });

  it("descarta el fin de semana", () => {
    expect(esDiaHabil(d("2026-08-08"))).toBe(false); // sábado
    expect(esDiaHabil(d("2026-08-09"))).toBe(false); // domingo
  });
});

describe("siguienteDiaHabil", () => {
  it("deja pasar un día hábil sin moverlo", () => {
    expect(iso(siguienteDiaHabil(d("2026-08-07")))).toBe("2026-08-07");
  });

  it("empuja el fin de semana al lunes", () => {
    expect(iso(siguienteDiaHabil(d("2026-08-08")))).toBe("2026-08-10");
    expect(iso(siguienteDiaHabil(d("2026-08-09")))).toBe("2026-08-10");
  });

  it("no muta la fecha que recibe", () => {
    const sabado = d("2026-08-08");
    siguienteDiaHabil(sabado);
    expect(iso(sabado)).toBe("2026-08-08");
  });
});

describe("finTrasDiasHabiles", () => {
  it("una tarea de un día empieza y termina el mismo día", () => {
    expect(iso(finTrasDiasHabiles(d("2026-08-03"), 1))).toBe("2026-08-03");
  });

  it("cuenta los dos extremos y salta el fin de semana", () => {
    // lun 03 + 5 hábiles = vie 07 (misma semana).
    expect(iso(finTrasDiasHabiles(d("2026-08-03"), 5))).toBe("2026-08-07");
    // lun 03 + 6 hábiles cruza el fin de semana y cae el lun 10.
    expect(iso(finTrasDiasHabiles(d("2026-08-03"), 6))).toBe("2026-08-10");
  });

  it("arranca del próximo hábil si el inicio cae en fin de semana", () => {
    expect(iso(finTrasDiasHabiles(d("2026-08-08"), 1))).toBe("2026-08-10");
  });

  it("trata una duración de 0 o negativa como un día", () => {
    expect(iso(finTrasDiasHabiles(d("2026-08-03"), 0))).toBe("2026-08-03");
    expect(iso(finTrasDiasHabiles(d("2026-08-03"), -4))).toBe("2026-08-03");
  });
});

describe("diasHabilesEntre", () => {
  it("cuenta ambos extremos", () => {
    expect(diasHabilesEntre(d("2026-08-03"), d("2026-08-03"))).toBe(1);
    expect(diasHabilesEntre(d("2026-08-03"), d("2026-08-07"))).toBe(5);
  });

  it("no cuenta el fin de semana", () => {
    // lun 03 → lun 10 son 8 días corridos, 6 hábiles.
    expect(diasHabilesEntre(d("2026-08-03"), d("2026-08-10"))).toBe(6);
    // sáb 08 → dom 09 no tiene ninguno.
    expect(diasHabilesEntre(d("2026-08-08"), d("2026-08-09"))).toBe(0);
  });

  it("devuelve 0 si el fin es anterior al inicio", () => {
    expect(diasHabilesEntre(d("2026-08-07"), d("2026-08-03"))).toBe(0);
  });
});

describe("fechaDesdeISO / isoDesdeFecha", () => {
  it("van y vuelven en UTC", () => {
    // El día no se corre por la zona horaria del proceso: es lo que hace que
    // en Argentina una fecha no se lea como la del día anterior.
    expect(fechaDesdeISO("2026-08-03").getUTCDate()).toBe(3);
    expect(fechaDesdeISO("2026-08-03").getUTCHours()).toBe(0);
    expect(iso(fechaDesdeISO("2026-08-03"))).toBe("2026-08-03");
  });
});
