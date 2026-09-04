import { describe, expect, it } from "vitest";
import { urlFiltroMes } from "./url-filtro";

const base = { basePath: "/timetracker", anio: 2026, mes: 8 };
const proyectos = (ids: string[], total = 3) => [{ clave: "proyectos", ids, total }];

describe("urlFiltroMes", () => {
  it("el mes siempre viaja", () => {
    expect(urlFiltroMes({ ...base, filtros: proyectos([]) })).toBe(
      "/timetracker?anio=2026&mes=8",
    );
  });

  it("una selección parcial viaja", () => {
    expect(urlFiltroMes({ ...base, filtros: proyectos(["a", "b"]) })).toBe(
      "/timetracker?anio=2026&mes=8&proyectos=a%2Cb",
    );
  });

  it("con todo elegido el filtro NO viaja", () => {
    // Es el default: así el enlace queda limpio y "sin parámetro" significa
    // siempre lo mismo.
    expect(urlFiltroMes({ ...base, filtros: proyectos(["a", "b", "c"]) })).toBe(
      "/timetracker?anio=2026&mes=8",
    );
  });

  it("conserva lo que no maneja este filtro", () => {
    // Sin esto, moverse de mes perdía el usuario para el que un admin carga.
    expect(
      urlFiltroMes({ ...base, filtros: proyectos([]), extra: { usuario: "u1" } }),
    ).toBe("/timetracker?anio=2026&mes=8&usuario=u1");
  });

  it("ignora los extras vacíos", () => {
    expect(
      urlFiltroMes({ ...base, filtros: proyectos([]), extra: { usuario: undefined } }),
    ).toBe("/timetracker?anio=2026&mes=8");
  });

  it("limpiar el filtro es mandar todas las opciones", () => {
    // Es lo que hace el atajo del indicador: elegir todo produce la misma URL
    // que no haber filtrado nunca, mes y extras incluidos. Si esto dejara el
    // parámetro puesto, el contador seguiría ahí después de tocarlo.
    const conFiltro = urlFiltroMes({ ...base, filtros: proyectos(["a"]) });
    const limpia = urlFiltroMes({ ...base, filtros: proyectos(["a", "b", "c"]) });
    expect(conFiltro).toContain("proyectos=a");
    expect(limpia).not.toContain("proyectos");
    expect(limpia).toBe("/timetracker?anio=2026&mes=8");
  });

  it("varios filtros conviven en la misma URL", () => {
    // Es la razón de que exista una sola función: elegir un Mentor Owner no
    // puede borrar el filtro de proyectos, ni moverse de mes borrar los dos.
    expect(
      urlFiltroMes({
        ...base,
        filtros: [
          { clave: "proyectos", ids: ["a"], total: 3 },
          { clave: "owners", ids: ["u1"], total: 2 },
        ],
      }),
    ).toBe("/timetracker?anio=2026&mes=8&proyectos=a&owners=u1");
  });

  it("un filtro completo se borra sin tocar al otro", () => {
    expect(
      urlFiltroMes({
        ...base,
        filtros: [
          { clave: "proyectos", ids: ["a", "b", "c"], total: 3 },
          { clave: "owners", ids: ["u1"], total: 2 },
        ],
      }),
    ).toBe("/timetracker?anio=2026&mes=8&owners=u1");
  });
});
