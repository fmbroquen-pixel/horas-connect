import { describe, expect, it } from "vitest";
import { moverAIndice } from "./reordenable";

// El índice de destino se expresa sobre la lista ANTES de sacar el elemento:
// 0 = antes de todo, n = después del último.
const tres = ["A", "B", "C"];
const cuatro = ["A", "B", "C", "D"];

describe("moverAIndice", () => {
  describe("desde el medio (el caso que estaba roto)", () => {
    it("llega a la primera posición", () => {
      expect(moverAIndice(tres, "B", 0)).toEqual(["B", "A", "C"]);
    });

    it("llega a la última posición", () => {
      // Este es el bug que se corrige: con la versión anterior soltar la del
      // medio sobre la última no hacía nada, porque siempre insertaba ANTES
      // del ítem apuntado.
      expect(moverAIndice(tres, "B", 3)).toEqual(["A", "C", "B"]);
    });
  });

  describe("desde el principio", () => {
    it("llega a la última posición de una", () => {
      expect(moverAIndice(tres, "A", 3)).toEqual(["B", "C", "A"]);
    });

    it("llega a una posición intermedia", () => {
      expect(moverAIndice(cuatro, "A", 2)).toEqual(["B", "A", "C", "D"]);
      expect(moverAIndice(cuatro, "A", 3)).toEqual(["B", "C", "A", "D"]);
    });
  });

  describe("desde el final", () => {
    it("llega a la primera", () => {
      expect(moverAIndice(tres, "C", 0)).toEqual(["C", "A", "B"]);
    });

    it("llega al medio", () => {
      expect(moverAIndice(tres, "C", 1)).toEqual(["A", "C", "B"]);
    });
  });

  describe("no hace nada cuando no hay movimiento real", () => {
    it("soltar en su propia posición", () => {
      expect(moverAIndice(tres, "B", 1)).toBeNull();
    });

    it("soltar justo después de sí mismo es la misma posición", () => {
      expect(moverAIndice(tres, "B", 2)).toBeNull();
    });

    it("el primero al principio y el último al final", () => {
      expect(moverAIndice(tres, "A", 0)).toBeNull();
      expect(moverAIndice(tres, "C", 3)).toBeNull();
    });
  });

  it("ignora un id que no está en la lista", () => {
    expect(moverAIndice(tres, "Z", 0)).toBeNull();
  });

  it("con dos elementos se pueden intercambiar en los dos sentidos", () => {
    expect(moverAIndice(["A", "B"], "B", 0)).toEqual(["B", "A"]);
    expect(moverAIndice(["A", "B"], "A", 2)).toEqual(["B", "A"]);
  });

  it("nunca pierde ni duplica elementos", () => {
    const orig = ["A", "B", "C", "D", "E"];
    for (const id of orig) {
      for (let i = 0; i <= orig.length; i++) {
        const r = moverAIndice(orig, id, i);
        if (!r) continue;
        expect(r).toHaveLength(orig.length);
        expect([...r].sort()).toEqual([...orig].sort());
      }
    }
  });

  it("toda posición es alcanzable desde cualquier origen", () => {
    // La garantía que pedía el bug: cada elemento puede terminar en cada
    // lugar de la lista con un solo movimiento.
    const orig = ["A", "B", "C", "D"];
    for (const id of orig) {
      const alcanzadas = new Set<number>();
      for (let i = 0; i <= orig.length; i++) {
        const r = moverAIndice(orig, id, i) ?? orig;
        alcanzadas.add(r.indexOf(id));
      }
      expect([...alcanzadas].sort()).toEqual([0, 1, 2, 3]);
    }
  });
});
