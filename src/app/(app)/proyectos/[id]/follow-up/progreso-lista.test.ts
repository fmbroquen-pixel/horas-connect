import { describe, expect, it } from "vitest";
import { progresoLista } from "./constantes";

const t = (...estados: string[]) => estados.map((estado) => ({ estado }));

describe("progresoLista", () => {
  it("una lista vacía está sin iniciar y en 0%", () => {
    expect(progresoLista([])).toEqual({
      porcentaje: 0,
      estado: "sin_iniciar",
      cerradas: 0,
      total: 0,
    });
  });

  it("mientras nada arrancó sigue sin iniciar", () => {
    const r = progresoLista(t("sin_iniciar", "sin_iniciar"));
    expect(r.estado).toBe("sin_iniciar");
    expect(r.porcentaje).toBe(0);
  });

  it("una tarea en curso pone la lista en curso, pero no suma avance", () => {
    // Una tarea empezada todavía no entregó nada: el porcentaje mide lo
    // CERRADO, no lo que arrancó.
    const r = progresoLista(t("en_curso", "sin_iniciar"));
    expect(r.estado).toBe("en_curso");
    expect(r.porcentaje).toBe(0);
    expect(r.cerradas).toBe(0);
  });

  it("las no ejecutadas cuentan como cerradas", () => {
    // Se decidió no hacerlas, así que no pueden dejar la lista trabada en 90%
    // para siempre.
    const r = progresoLista(t("finalizada", "no_ejecutada", "sin_iniciar", "sin_iniciar"));
    expect(r.cerradas).toBe(2);
    expect(r.porcentaje).toBe(50);
    expect(r.estado).toBe("en_curso");
  });

  it("todo cerrado deja la lista finalizada en 100%", () => {
    expect(progresoLista(t("finalizada", "finalizada")).estado).toBe("finalizada");
    expect(progresoLista(t("finalizada", "finalizada")).porcentaje).toBe(100);
    // También si el cierre fue por no ejecutarlas.
    expect(progresoLista(t("no_ejecutada", "finalizada")).estado).toBe("finalizada");
  });

  it("redondea el porcentaje", () => {
    expect(progresoLista(t("finalizada", "sin_iniciar", "sin_iniciar")).porcentaje).toBe(33);
    expect(progresoLista(t("finalizada", "finalizada", "sin_iniciar")).porcentaje).toBe(67);
  });
});
