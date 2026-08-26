import { describe, expect, it } from "vitest";
import { tarifaVigenteA, type TarifaVigencia } from "./tarifas";

const d = (iso: string) => new Date(iso);

// Una tarifa que subió el 1 de julio: la vieja cierra y la nueva abre con el
// mismo instante, que es como las escribe Settings.
const CAMBIO = d("2026-07-01T10:00:00Z");
const HISTORIAL: TarifaVigencia[] = [
  { valorUsd: 40, vigenteDesde: d("2026-05-01T00:00:00Z"), vigenteHasta: CAMBIO },
  { valorUsd: 55, vigenteDesde: CAMBIO, vigenteHasta: null },
];

describe("tarifaVigenteA", () => {
  it("un registro viejo mantiene la tarifa que regía entonces", () => {
    // El punto de todo esto: editar en agosto un registro de junio no puede
    // reescribirle el monto con la tarifa de agosto.
    expect(tarifaVigenteA(HISTORIAL, d("2026-06-15T00:00:00Z"))).toBe(40);
  });

  it("un registro nuevo toma la tarifa nueva", () => {
    expect(tarifaVigenteA(HISTORIAL, d("2026-08-15T00:00:00Z"))).toBe(55);
  });

  it("el borde pertenece a la tarifa nueva", () => {
    // Las dos comparten el instante del cambio; si el borde cayera en la
    // vieja, habría un momento con dos tarifas aplicables.
    expect(tarifaVigenteA(HISTORIAL, CAMBIO)).toBe(55);
    expect(tarifaVigenteA(HISTORIAL, new Date(CAMBIO.getTime() - 1))).toBe(40);
  });

  it("antes de toda tarifa conocida, usa la más vieja", () => {
    // Hoy la mayoría de los registros son anteriores a la tarifa más vieja:
    // sin esto no se podrían editar.
    expect(tarifaVigenteA(HISTORIAL, d("2026-01-01T00:00:00Z"))).toBe(40);
  });

  it("sin tarifas no inventa nada", () => {
    expect(tarifaVigenteA([], d("2026-06-15T00:00:00Z"))).toBeNull();
  });

  it("una combinación cerrada sin reemplazo no aplica hacia adelante", () => {
    // Si la última tarifa tiene fin y no hay otra, para una fecha posterior no
    // hay respuesta: avisar es mejor que estirar un valor vencido.
    const cerrada: TarifaVigencia[] = [
      { valorUsd: 40, vigenteDesde: d("2026-05-01T00:00:00Z"), vigenteHasta: CAMBIO },
    ];
    expect(tarifaVigenteA(cerrada, d("2026-08-01T00:00:00Z"))).toBeNull();
    expect(tarifaVigenteA(cerrada, d("2026-06-01T00:00:00Z"))).toBe(40);
  });

  it("con una sola tarifa abierta, sirve para cualquier fecha", () => {
    const unica: TarifaVigencia[] = [
      { valorUsd: 30, vigenteDesde: d("2026-07-11T00:00:00Z"), vigenteHasta: null },
    ];
    expect(tarifaVigenteA(unica, d("2026-06-30T00:00:00Z"))).toBe(30);
    expect(tarifaVigenteA(unica, d("2026-12-31T00:00:00Z"))).toBe(30);
  });
});
