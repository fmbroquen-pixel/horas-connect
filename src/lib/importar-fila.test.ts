import { describe, expect, it } from "vitest";
import {
  claveDuplicado,
  resolverClienteDeFila,
  resolverDuenio,
  type ClienteCatalogo,
  type Persona,
} from "./importar-fila";
import { normalizarNombre as k } from "./normalizar-nombre";

const ANA: Persona = { id: "u-ana", nombre: "Ana Perez" };
const BETO: Persona = { id: "u-beto", nombre: "Beto Diaz" };
const CARO: Persona = { id: "u-caro", nombre: "Caro Lopez" };

const mapa = (ps: Persona[]) => new Map(ps.map((p) => [k(p.nombre), p]));
const TODOS = mapa([ANA, BETO, CARO]);

const EMBARCA: Persona = { id: "c-emb", nombre: "Embarca" };
const NITES: Persona = { id: "c-nit", nombre: "Nites" };
const CATALOGO = new Map<string, ClienteCatalogo>([
  [k("Embarca"), { nombre: "Embarca", activo: true }],
  [k("Nites"), { nombre: "Nites", activo: false }],
  [k("Valca"), { nombre: "Valca", activo: true }],
]);

describe("resolverDuenio", () => {
  const visibles = mapa([ANA, BETO]); // un admin que ve a dos

  it("resuelve por nombre y devuelve el id", () => {
    const r = resolverDuenio("Ana Perez", k("Ana Perez"), visibles, TODOS);
    expect(r).toEqual({ valor: ANA });
  });

  it("el nombre puede venir de cualquier forma", () => {
    // Es lo que sale de un Excel: mayúsculas, espacios de sobra, acentos.
    for (const v of ["ANA PEREZ", "  ana perez  ", "Ana Pérez"]) {
      expect(resolverDuenio(v, k(v), visibles, TODOS)).toEqual({ valor: ANA });
    }
  });

  it("un archivo con varios mentores resuelve cada fila por separado", () => {
    expect(resolverDuenio("Ana Perez", k("Ana Perez"), visibles, TODOS)).toEqual({ valor: ANA });
    expect(resolverDuenio("Beto Diaz", k("Beto Diaz"), visibles, TODOS)).toEqual({ valor: BETO });
  });

  it("celda vacía", () => {
    expect(resolverDuenio("   ", k("   "), visibles, TODOS)).toEqual({
      error: "Falta el usuario",
    });
  });

  it("nombre que no existe en el padrón", () => {
    expect(resolverDuenio("Fulano", k("Fulano"), visibles, TODOS)).toEqual({
      error: "Usuario inexistente",
    });
  });

  it("existe pero quien importa no puede cargarle horas", () => {
    // Un mentor importando un archivo que trae a otro. No es un error de
    // tipeo: decirle "inexistente" lo manda a corregir un nombre correcto.
    const soloYo = mapa([ANA]);
    expect(resolverDuenio("Caro Lopez", k("Caro Lopez"), soloYo, TODOS)).toEqual({
      error: 'No podés cargar horas de "Caro Lopez"',
    });
  });
});

describe("resolverClienteDeFila", () => {
  const carteraDeAna = mapa([EMBARCA]);

  it("resuelve contra la cartera del DUEÑO de la fila", () => {
    const r = resolverClienteDeFila("Embarca", k("Embarca"), ANA, carteraDeAna, CATALOGO);
    expect(r).toEqual({ valor: EMBARCA });
  });

  it("celda vacía", () => {
    expect(
      resolverClienteDeFila("", k(""), ANA, carteraDeAna, CATALOGO),
    ).toEqual({ error: "Falta el cliente" });
  });

  it("cliente que no existe", () => {
    expect(
      resolverClienteDeFila("Fantasma", k("Fantasma"), ANA, carteraDeAna, CATALOGO),
    ).toEqual({ error: "Cliente inexistente" });
  });

  it("cliente inactivo: no admite carga nueva, ni siquiera pasada", () => {
    expect(
      resolverClienteDeFila("Nites", k("Nites"), ANA, carteraDeAna, CATALOGO),
    ).toEqual({
      error: '"Nites" está inactivo: no admite registros nuevos',
    });
  });

  it("existe y está activo, pero no es de esa persona", () => {
    // El caso que antes salía como "inexistente" y mandaba a revisar la
    // ortografía. Dice de quién no es, que es lo que permite accionar.
    expect(
      resolverClienteDeFila("Valca", k("Valca"), ANA, carteraDeAna, CATALOGO),
    ).toEqual({ error: '"Valca" no está asignado a Ana Perez' });
  });

  it("el mismo cliente resuelve para uno y falla para otro", () => {
    // Es todo el punto de validar por fila: un archivo con dos mentores tiene
    // dos carteras distintas.
    const carteraDeBeto = mapa([NITES]);
    expect(
      resolverClienteDeFila("Embarca", k("Embarca"), ANA, carteraDeAna, CATALOGO),
    ).toEqual({ valor: EMBARCA });
    expect(
      resolverClienteDeFila("Embarca", k("Embarca"), BETO, carteraDeBeto, CATALOGO),
    ).toEqual({ error: '"Embarca" no está asignado a Beto Diaz' });
  });
});

describe("claveDuplicado", () => {
  const base = {
    fechaISO: "2026-08-01",
    clienteId: "c-emb",
    conceptoId: "k1",
    ownership: "owner",
    modalidad: "presencial",
    horas: 1.5,
  };

  it("dos mentores con la misma actividad no son un duplicado", () => {
    // Sin el usuario en la clave, la segunda fila del archivo se descartaba en
    // silencio y se perdían horas reales.
    expect(claveDuplicado({ ...base, usuarioId: "u-ana" })).not.toBe(
      claveDuplicado({ ...base, usuarioId: "u-beto" }),
    );
  });

  it("la misma persona repitiendo la misma fila sí lo es", () => {
    expect(claveDuplicado({ ...base, usuarioId: "u-ana" })).toBe(
      claveDuplicado({ ...base, usuarioId: "u-ana" }),
    );
  });

  it("cambiar cualquier dato la hace distinta", () => {
    const a = claveDuplicado({ ...base, usuarioId: "u-ana" });
    expect(claveDuplicado({ ...base, usuarioId: "u-ana", horas: 2 })).not.toBe(a);
    expect(claveDuplicado({ ...base, usuarioId: "u-ana", fechaISO: "2026-08-02" })).not.toBe(a);
  });
});
