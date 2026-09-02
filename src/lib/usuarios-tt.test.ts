import { describe, expect, it } from "vitest";
import { idsUsuariosDelFiltro } from "./usuarios-tt";

const VISIBLES = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];

describe("idsUsuariosDelFiltro", () => {
  it("sin filtro, todos los visibles", () => {
    expect(idsUsuariosDelFiltro(VISIBLES, undefined)).toEqual(["u1", "u2", "u3"]);
    expect(idsUsuariosDelFiltro(VISIBLES, "")).toEqual(["u1", "u2", "u3"]);
  });

  it("con filtro, solo los pedidos", () => {
    expect(idsUsuariosDelFiltro(VISIBLES, "u1,u3")).toEqual(["u1", "u3"]);
  });

  it("tolera espacios y comas de más", () => {
    expect(idsUsuariosDelFiltro(VISIBLES, " u1 , , u2 ")).toEqual(["u1", "u2"]);
  });

  it("un id ajeno en la URL no abre nada", () => {
    // Lo pedido se cruza con lo visible: un mentor no ve las horas de otro
    // por escribir su id en la barra de direcciones.
    expect(idsUsuariosDelFiltro([{ id: "u1" }], "u1,u2")).toEqual(["u1"]);
    expect(idsUsuariosDelFiltro([{ id: "u1" }], "u2")).toEqual(["u1"]);
  });

  it("un filtro que no aplica muestra todos, no una tabla vacía", () => {
    expect(idsUsuariosDelFiltro(VISIBLES, "ajeno")).toEqual(["u1", "u2", "u3"]);
  });

  it("sin usuarios visibles no hay nada que consultar", () => {
    expect(idsUsuariosDelFiltro([], "u1")).toEqual([]);
  });
});
