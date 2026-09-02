import { describe, expect, it } from "vitest";
import { normalizarNombre } from "./normalizar-nombre";

// Escritos como escape y no como el caracter: son invisibles, y un test que no
// se puede leer en un diff no protege nada.
const NBSP = "\u00a0"; // espacio duro, el que mete Excel
const ANCHO_CERO = "\u200b";

describe("normalizarNombre", () => {
  it("el caso Embarca: mayúsculas y espacios sueltos dan la misma clave", () => {
    const esperado = normalizarNombre("Embarca");
    for (const v of ["Embarca", "EMBARCA", " embarca ", "  EmBaRcA  "]) {
      expect(normalizarNombre(v)).toBe(esperado);
    }
    expect(esperado).toBe("embarca");
  });

  it("ignora el espacio duro que mete Excel", () => {
    expect(normalizarNombre(NBSP + "Embarca" + NBSP)).toBe("embarca");
    expect(normalizarNombre("Rule" + NBSP + "Retali")).toBe("rule retali");
  });

  it("ignora el espacio de ancho cero", () => {
    expect(normalizarNombre("Embarca" + ANCHO_CERO)).toBe("embarca");
  });

  it("colapsa los espacios de más del medio", () => {
    expect(normalizarNombre("Rule   Retali")).toBe("rule retali");
  });

  it("el acento no decide si la fila entra", () => {
    expect(normalizarNombre("Muñoz")).toBe(normalizarNombre("Munoz"));
    expect(normalizarNombre("Andrés")).toBe(normalizarNombre("Andres"));
  });

  it("nombres distintos siguen siendo distintos", () => {
    // La normalización afloja el cotejo; no puede llegar a fusionar clientes.
    expect(normalizarNombre("Nites")).not.toBe(normalizarNombre("Nites 2"));
    expect(normalizarNombre("ARGPEX")).not.toBe(normalizarNombre("ARGPEZ"));
  });

  it("una celda vacía no resuelve a nada", () => {
    expect(normalizarNombre("   ")).toBe("");
  });
});
