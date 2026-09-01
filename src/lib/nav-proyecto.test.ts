import { describe, expect, it } from "vitest";
import { idDeProyectoEnRuta, prefijoDeProyectoInactivo } from "./nav-proyecto";

const APAGADOS = ["c-inactivo", "c-otro"];

describe("idDeProyectoEnRuta", () => {
  it("saca el id del detalle y de sus pestañas", () => {
    expect(idDeProyectoEnRuta("/proyectos/abc")).toBe("abc");
    expect(idDeProyectoEnRuta("/proyectos/abc/follow-up")).toBe("abc");
    expect(idDeProyectoEnRuta("/proyectos/abc/equipo")).toBe("abc");
  });

  it("los listados no son un proyecto", () => {
    expect(idDeProyectoEnRuta("/proyectos")).toBeNull();
    expect(idDeProyectoEnRuta("/proyectos/inactivos")).toBeNull();
  });

  it("otras secciones tampoco", () => {
    expect(idDeProyectoEnRuta("/timetracker")).toBeNull();
    expect(idDeProyectoEnRuta("/dashboard")).toBeNull();
    // No alcanza con que empiece parecido.
    expect(idDeProyectoEnRuta("/proyectos-viejos/abc")).toBeNull();
  });
});

describe("prefijoDeProyectoInactivo", () => {
  it("un proyecto apagado se marca bajo Inactivos", () => {
    expect(prefijoDeProyectoInactivo("/proyectos/c-inactivo", APAGADOS)).toBe(
      "/proyectos/c-inactivo",
    );
  });

  it("vale igual en cualquiera de sus pestañas", () => {
    // Entrar por "Próximas dos semanas" del Home cae en follow-up, no en el
    // detalle: si solo se contemplara la raíz, ese camino quedaría en Activos.
    expect(
      prefijoDeProyectoInactivo("/proyectos/c-inactivo/follow-up", APAGADOS),
    ).toBe("/proyectos/c-inactivo");
    expect(
      prefijoDeProyectoInactivo("/proyectos/c-inactivo/equipo", APAGADOS),
    ).toBe("/proyectos/c-inactivo");
  });

  it("un proyecto activo no se toca", () => {
    // Null y no el prefijo: la regla de siempre ya lo resuelve bien, y forzar
    // algo acá seria arreglar lo que no estaba roto.
    expect(prefijoDeProyectoInactivo("/proyectos/c-activo", APAGADOS)).toBeNull();
  });

  it("los listados y el resto de la app no se tocan", () => {
    expect(prefijoDeProyectoInactivo("/proyectos", APAGADOS)).toBeNull();
    expect(prefijoDeProyectoInactivo("/proyectos/inactivos", APAGADOS)).toBeNull();
    expect(prefijoDeProyectoInactivo("/timetracker", APAGADOS)).toBeNull();
  });

  it("sin apagados no hay nada que reubicar", () => {
    expect(prefijoDeProyectoInactivo("/proyectos/c-inactivo", [])).toBeNull();
  });
});
