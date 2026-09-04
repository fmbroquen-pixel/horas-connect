import { describe, expect, it } from "vitest";
import {
  filtraAlgo,
  idsFiltrados,
  ownersDe,
  parsearIds,
  type ProyectoDelScope,
} from "./scope-filtros";

const p = (
  id: string,
  nombre: string,
  ownerId: string | null = null,
  ownerNombre: string | null = null,
): ProyectoDelScope => ({ id, nombre, ownerId, ownerNombre });

// Tres proyectos, dos owners: Ana tiene dos y Leo uno.
const PROYECTOS = [
  p("acme", "Acme", "ana", "Ana"),
  p("beta", "Beta", "leo", "Leo"),
  p("gama", "Gama", "ana", "Ana"),
];

describe("parsearIds", () => {
  it("sin parámetro no hay nada elegido", () => {
    expect(parsearIds(undefined, ["a", "b"])).toEqual([]);
    expect(parsearIds("", ["a", "b"])).toEqual([]);
  });

  it("descarta los ids que no existen", () => {
    // Un link viejo o de otro usuario no puede abrir un proyecto ajeno ni
    // dejar la pantalla rota.
    expect(parsearIds("a,ajeno,b", ["a", "b"])).toEqual(["a", "b"]);
  });

  it("tolera espacios y comas de más", () => {
    expect(parsearIds(" a , ,b ", ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("ownersDe", () => {
  it("lista cada owner una vez, por nombre", () => {
    expect(ownersDe(PROYECTOS)).toEqual([
      { id: "ana", nombre: "Ana" },
      { id: "leo", nombre: "Leo" },
    ]);
  });

  it("un proyecto sin owner no agrega opciones", () => {
    expect(ownersDe([p("solo", "Solo")])).toEqual([]);
  });
});

describe("filtraAlgo", () => {
  it("ni ninguno ni todos son un filtro", () => {
    // Las dos significan la vista completa, y es el mismo criterio con el que
    // el parámetro viaja o no en la URL.
    expect(filtraAlgo([], 3)).toBe(false);
    expect(filtraAlgo(["a", "b", "c"], 3)).toBe(false);
    expect(filtraAlgo(["a"], 3)).toBe(true);
  });
});

describe("idsFiltrados", () => {
  it("sin filtros están todos", () => {
    expect(idsFiltrados(PROYECTOS, [], [])).toEqual(["acme", "beta", "gama"]);
  });

  it("filtra por proyecto", () => {
    expect(idsFiltrados(PROYECTOS, ["acme"], [])).toEqual(["acme"]);
  });

  it("filtra por Mentor Owner", () => {
    expect(idsFiltrados(PROYECTOS, [], ["ana"])).toEqual(["acme", "gama"]);
  });

  it("combinados se cruzan con Y, no se suman", () => {
    // "De estos dos, el de Ana": queda uno. Si se sumaran, agregar un filtro
    // agrandaría el resultado, que es lo contrario de acotar.
    expect(idsFiltrados(PROYECTOS, ["acme", "beta"], ["ana"])).toEqual(["acme"]);
  });

  it("una combinación sin intersección no devuelve nada", () => {
    expect(idsFiltrados(PROYECTOS, ["beta"], ["ana"])).toEqual([]);
  });

  it("elegir todos los proyectos es no filtrar", () => {
    expect(idsFiltrados(PROYECTOS, ["acme", "beta", "gama"], [])).toEqual([
      "acme",
      "beta",
      "gama",
    ]);
  });

  it("elegir todos los owners es no filtrar, y no esconde a los huérfanos", () => {
    // Con los dos owners elegidos el filtro está apagado, así que un proyecto
    // sin owner sigue apareciendo.
    const con = [...PROYECTOS, p("huerfano", "Huérfano")];
    expect(idsFiltrados(con, [], ["ana", "leo"])).toEqual([
      "acme",
      "beta",
      "gama",
      "huerfano",
    ]);
  });

  it("un proyecto sin Mentor Owner no pertenece a ninguno", () => {
    // Con el filtro de owners puesto queda afuera: no es de nadie. Se lo ve
    // apagando ese filtro.
    const con = [...PROYECTOS, p("huerfano", "Huérfano")];
    expect(idsFiltrados(con, [], ["ana"])).toEqual(["acme", "gama"]);
  });
});
