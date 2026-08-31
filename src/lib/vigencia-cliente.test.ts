import { describe, expect, it } from "vitest";
import {
  admiteCargaNueva,
  apareceEnPeriodo,
  type ClienteVigencia,
} from "./vigencia-cliente";

const ACTIVO: ClienteVigencia = { activo: true, inactivadoEn: null };
const INACTIVO_EN_AGOSTO: ClienteVigencia = {
  activo: false,
  inactivadoEn: new Date("2026-08-15T00:00:00Z"),
};
// Los que ya estaban inactivos antes de que existiera el campo.
const INACTIVO_SIN_FECHA: ClienteVigencia = { activo: false, inactivadoEn: null };

describe("admiteCargaNueva", () => {
  it("un cliente activo acepta carga", () => {
    expect(admiteCargaNueva(ACTIVO)).toBe(true);
  });

  it("un inactivo no acepta carga, tenga o no fecha", () => {
    expect(admiteCargaNueva(INACTIVO_EN_AGOSTO)).toBe(false);
    expect(admiteCargaNueva(INACTIVO_SIN_FECHA)).toBe(false);
  });
});

describe("apareceEnPeriodo", () => {
  it("un activo aparece siempre", () => {
    expect(apareceEnPeriodo(ACTIVO, "2026-08-01")).toBe(true);
  });

  it("aparece en los períodos anteriores a su inactivación", () => {
    // Si julio no lo ofreciera, sus horas de julio quedarían fuera del total
    // del mes y el número no cerraría con lo que se trabajó.
    expect(apareceEnPeriodo(INACTIVO_EN_AGOSTO, "2026-07-01")).toBe(true);
  });

  it("aparece en el mes en que se lo inactivó", () => {
    // El mes arranca el 1 y la inactivación fue el 15: hay dos semanas de ese
    // mes en las que sí operó.
    expect(apareceEnPeriodo(INACTIVO_EN_AGOSTO, "2026-08-01")).toBe(true);
  });

  it("no aparece en períodos posteriores", () => {
    expect(apareceEnPeriodo(INACTIVO_EN_AGOSTO, "2026-09-01")).toBe(false);
  });

  it("inactivo sin fecha aparece igual", () => {
    // Es preferible ofrecer un cliente de más en un filtro que esconder horas
    // que existen.
    expect(apareceEnPeriodo(INACTIVO_SIN_FECHA, "2026-09-01")).toBe(true);
  });
});
