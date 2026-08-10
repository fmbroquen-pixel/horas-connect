import { describe, expect, it } from "vitest";
import { indiceSegunDireccion, moverAIndice } from "./reordenable";

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

describe("indiceSegunDireccion", () => {
  // Apuntar a un ítem que está ARRIBA del que arrastro significa "quiero
  // quedar antes que él"; a uno de ABAJO, "después". Sin mitades: cualquier
  // punto del ítem apuntado da un movimiento real.
  it("subiendo, cae antes del apuntado", () => {
    expect(indiceSegunDireccion(0, 3)).toBe(0);
    expect(indiceSegunDireccion(1, 3)).toBe(1);
  });

  it("bajando, cae después del apuntado", () => {
    expect(indiceSegunDireccion(3, 0)).toBe(4);
    expect(indiceSegunDireccion(1, 0)).toBe(2);
  });

  it("apuntarse a sí mismo no mueve nada", () => {
    // Devuelve la posición siguiente, que moverAIndice reconoce como la que
    // el ítem ya ocupa.
    expect(moverAIndice(["A", "B", "C"], "B", indiceSegunDireccion(1, 1))).toBeNull();
  });

  it("el caso que faltaba: la última a la primera, apuntando a cualquier parte", () => {
    const dos = ["A", "B"];
    // Antes esto dependía de acertarle a la mitad de arriba de "A".
    expect(moverAIndice(dos, "B", indiceSegunDireccion(0, 1))).toEqual(["B", "A"]);

    const tres = ["A", "B", "C"];
    expect(moverAIndice(tres, "C", indiceSegunDireccion(0, 2))).toEqual(["C", "A", "B"]);
    expect(moverAIndice(tres, "C", indiceSegunDireccion(1, 2))).toEqual(["A", "C", "B"]);
  });

  it("apuntar a cualquier vecino siempre mueve", () => {
    // La garantía que rompía la zona muerta: ningún ítem apuntado, salvo uno
    // mismo, puede terminar en "no pasa nada".
    const ids = ["A", "B", "C", "D"];
    for (const [origenIdx, id] of ids.entries()) {
      for (let i = 0; i < ids.length; i++) {
        const r = moverAIndice(ids, id, indiceSegunDireccion(i, origenIdx));
        if (i === origenIdx) expect(r).toBeNull();
        else expect(r).not.toBeNull();
      }
    }
  });
});
