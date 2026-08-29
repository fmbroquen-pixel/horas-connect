import { describe, expect, it } from "vitest";
import {
  CIERRES_EN_CURSO,
  enCursoQueEstorba,
  esCierreValido,
  type TareaEstado,
} from "./secuencia-tareas";

const t = (id: string, estado: string): TareaEstado => ({
  id,
  nombre: `Tarea ${id}`,
  estado,
});

describe("enCursoQueEstorba", () => {
  it("encuentra la que ya está en curso", () => {
    const lista = [t("a", "finalizada"), t("b", "en_curso"), t("c", "sin_iniciar")];
    expect(enCursoQueEstorba(lista, "c")?.id).toBe("b");
  });

  it("marcar la que ya está en curso no es conflicto", () => {
    // Reafirmar el estado que ya tiene es una operación sin efecto, no un
    // choque contra sí misma.
    const lista = [t("a", "sin_iniciar"), t("b", "en_curso")];
    expect(enCursoQueEstorba(lista, "b")).toBeNull();
  });

  it("sin ninguna en curso no hay conflicto", () => {
    const lista = [t("a", "sin_iniciar"), t("b", "finalizada"), t("c", "no_ejecutada")];
    expect(enCursoQueEstorba(lista, "a")).toBeNull();
  });

  it("una lista vacía no estorba", () => {
    expect(enCursoQueEstorba([], "a")).toBeNull();
  });

  it("si hubiera dos en curso, devuelve una y con eso alcanza", () => {
    // No debería pasar, pero si la base quedó sucia el aviso tiene que salir
    // igual: se resuelve una por vez.
    const lista = [t("a", "en_curso"), t("b", "en_curso")];
    expect(enCursoQueEstorba(lista, "c")).not.toBeNull();
  });
});

describe("esCierreValido", () => {
  it("acepta los tres cierres ofrecidos", () => {
    for (const c of CIERRES_EN_CURSO) expect(esCierreValido(c)).toBe(true);
  });

  it("no acepta en_curso", () => {
    // Es justo el estado que se le está sacando: aceptarlo dejaría las dos
    // tareas en curso, que es lo que esto viene a impedir.
    expect(esCierreValido("en_curso")).toBe(false);
  });

  it("no acepta cualquier cosa", () => {
    expect(esCierreValido("")).toBe(false);
    expect(esCierreValido("finalizado")).toBe(false);
  });
});
