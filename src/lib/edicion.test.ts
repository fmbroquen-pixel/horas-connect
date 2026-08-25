import { describe, expect, it } from "vitest";
import { marcaDeEdicion } from "./edicion";

describe("marcaDeEdicion", () => {
  it("sin editor no hay marca", () => {
    // El caso normal: la enorme mayoría de los registros nunca se editan y no
    // tienen que mostrar nada.
    expect(marcaDeEdicion(null, new Date(2026, 7, 24))).toBeNull();
    expect(marcaDeEdicion(undefined, new Date(2026, 7, 24))).toBeNull();
  });

  it("cuenta quién y cuándo", () => {
    expect(marcaDeEdicion({ nombre: "Federico" }, new Date(2026, 7, 24))).toBe(
      "Editado por Federico el 24/08/2026",
    );
  });

  it("día y mes van con dos dígitos", () => {
    expect(marcaDeEdicion({ nombre: "Ana" }, new Date(2026, 0, 5))).toBe(
      "Editado por Ana el 05/01/2026",
    );
  });
});
