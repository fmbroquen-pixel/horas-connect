import { describe, expect, it } from "vitest";
import { urlFiltroMes } from "./url-filtro";

const base = { basePath: "/timetracker", anio: 2026, mes: 8, total: 3 };

describe("urlFiltroMes", () => {
  it("el mes siempre viaja", () => {
    expect(urlFiltroMes({ ...base, ids: [] })).toBe("/timetracker?anio=2026&mes=8");
  });

  it("una selección parcial viaja", () => {
    expect(urlFiltroMes({ ...base, ids: ["a", "b"] })).toBe(
      "/timetracker?anio=2026&mes=8&proyectos=a%2Cb",
    );
  });

  it("con todo elegido el filtro NO viaja", () => {
    // Es el default: así el enlace queda limpio y "sin parámetro" significa
    // siempre lo mismo.
    expect(urlFiltroMes({ ...base, ids: ["a", "b", "c"] })).toBe(
      "/timetracker?anio=2026&mes=8",
    );
  });

  it("conserva lo que no maneja este filtro", () => {
    // Sin esto, moverse de mes perdía el usuario para el que un admin carga.
    expect(urlFiltroMes({ ...base, ids: [], extra: { usuario: "u1" } })).toBe(
      "/timetracker?anio=2026&mes=8&usuario=u1",
    );
  });

  it("ignora los extras vacíos", () => {
    expect(urlFiltroMes({ ...base, ids: [], extra: { usuario: undefined } })).toBe(
      "/timetracker?anio=2026&mes=8",
    );
  });
});
