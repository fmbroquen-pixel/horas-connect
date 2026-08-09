import { describe, expect, it } from "vitest";
import { moverEnOrden } from "./reordenable";

const ids = ["a", "b", "c", "d"];

describe("moverEnOrden", () => {
  it("mueve hacia arriba: el arrastrado ocupa el lugar del destino", () => {
    expect(moverEnOrden(ids, "d", "b")).toEqual(["a", "d", "b", "c"]);
    expect(moverEnOrden(ids, "c", "a")).toEqual(["c", "a", "b", "d"]);
  });

  it("mueve hacia abajo: queda justo ANTES del destino", () => {
    // Siempre se inserta en el lugar del destino, que baja un puesto. Es lo
    // mismo que anuncia la línea indicadora, que se dibuja arriba del ítem
    // sobre el que se está soltando.
    expect(moverEnOrden(ids, "a", "c")).toEqual(["b", "a", "c", "d"]);
    expect(moverEnOrden(ids, "a", "d")).toEqual(["b", "c", "a", "d"]);
  });

  it("no hace nada al soltar sobre sí mismo", () => {
    expect(moverEnOrden(ids, "b", "b")).toBeNull();
  });

  it("no hace nada si el movimiento deja el mismo orden", () => {
    // Soltar "b" sobre "c" en a,b,c,d: b sale → a,c,d; se reinserta antes de
    // "c" → a,b,c,d. Mismo orden, así que no se guarda ni se recalculan
    // fechas.
    expect(moverEnOrden(ids, "b", "c")).toBeNull();
  });

  it("ignora ids que no están en la lista", () => {
    expect(moverEnOrden(ids, "z", "b")).toBeNull();
    expect(moverEnOrden(ids, "a", "z")).toBeNull();
  });

  it("conserva todos los elementos", () => {
    const r = moverEnOrden(ids, "d", "a");
    expect(r).toEqual(["d", "a", "b", "c"]);
    expect([...r!].sort()).toEqual([...ids].sort());
  });

  it("con un solo elemento no hay nada que mover", () => {
    expect(moverEnOrden(["a"], "a", "a")).toBeNull();
  });
});
