import { describe, expect, it } from "vitest";
import { diaUtc, reconstruirVigencias, type FilaVigencia } from "./vigencias";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

// `createdAt` solo desempata; se usa un contador para no tener que inventar
// horas en cada caso.
let n = 0;
const fila = (id: string, valorUsd: number, desde: string): FilaVigencia => ({
  id,
  valorUsd,
  vigenteDesde: d(desde),
  createdAt: new Date(2000, 0, 1, 0, 0, n++),
});

describe("reconstruirVigencias", () => {
  it("encadena los tramos y deja el último abierto", () => {
    const plan = reconstruirVigencias([
      fila("a", 30, "2026-01-01"),
      fila("b", 40, "2026-06-01"),
    ]);
    expect(plan.eliminar).toEqual([]);
    expect(plan.actualizar).toEqual([
      { id: "a", vigenteDesde: d("2026-01-01"), vigenteHasta: d("2026-06-01") },
      { id: "b", vigenteDesde: d("2026-06-01"), vigenteHasta: null },
    ]);
  });

  it("ordena por fecha, no por cómo vinieron", () => {
    // Corregir la fecha de una tarifa vieja la manda al principio de la
    // cadena; si se respetara el orden de llegada, quedaría cerrando a otra.
    const plan = reconstruirVigencias([
      fila("b", 40, "2026-06-01"),
      fila("a", 30, "2026-01-01"),
    ]);
    expect(plan.actualizar).toEqual([
      { id: "a", vigenteDesde: d("2026-01-01"), vigenteHasta: d("2026-06-01") },
      { id: "b", vigenteDesde: d("2026-06-01"), vigenteHasta: null },
    ]);
  });

  it("dos cambios el mismo día: vale el último guardado", () => {
    // El caso que ensució la base real: poner un valor y corregirlo enseguida
    // dejaba las dos filas, la primera con vigencia de duración cero.
    const plan = reconstruirVigencias([
      fila("vieja", 35, "2026-07-13"),
      fila("nueva", 0, "2026-07-13"),
    ]);
    expect(plan.eliminar).toEqual(["vieja"]);
    expect(plan.actualizar).toEqual([
      { id: "nueva", vigenteDesde: d("2026-07-13"), vigenteHasta: null },
    ]);
  });

  it("un valor repetido no abre un tramo nuevo", () => {
    // Guardar 40 dos veces no es un cambio de tarifa: el tramo sigue siendo
    // uno solo, desde la primera vez.
    const plan = reconstruirVigencias([
      fila("a", 40, "2026-01-01"),
      fila("b", 40, "2026-06-01"),
    ]);
    expect(plan.eliminar).toEqual(["b"]);
    expect(plan.actualizar).toEqual([
      { id: "a", vigenteDesde: d("2026-01-01"), vigenteHasta: null },
    ]);
  });

  it("volver a un valor anterior sí abre un tramo", () => {
    // 40 → 30 → 40 son tres tramos: el último 40 no es repetición del
    // primero, hay un 30 en el medio.
    const plan = reconstruirVigencias([
      fila("a", 40, "2026-01-01"),
      fila("b", 30, "2026-03-01"),
      fila("c", 40, "2026-06-01"),
    ]);
    expect(plan.eliminar).toEqual([]);
    expect(plan.actualizar.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("sin filas no propone nada", () => {
    expect(reconstruirVigencias([])).toEqual({ actualizar: [], eliminar: [] });
  });

  it("limpia el historial real de la base", () => {
    // Las cinco filas que quedaron en producción de las pruebas: 35 y 0 el
    // mismo día, dos veces, y el 35 final. La verdad de eso es que la tarifa
    // fue 0 desde el 13/07 y pasó a 35 el 04/08.
    const plan = reconstruirVigencias([
      fila("t1", 35, "2026-07-13"),
      fila("t2", 0, "2026-07-13"),
      fila("t3", 35, "2026-07-16"),
      fila("t4", 0, "2026-07-16"),
      fila("t5", 35, "2026-08-04"),
    ]);
    expect(plan.eliminar.sort()).toEqual(["t1", "t3", "t4"]);
    expect(plan.actualizar).toEqual([
      { id: "t2", vigenteDesde: d("2026-07-13"), vigenteHasta: d("2026-08-04") },
      { id: "t5", vigenteDesde: d("2026-08-04"), vigenteHasta: null },
    ]);
  });
});

describe("diaUtc", () => {
  it("descarta la hora", () => {
    expect(diaUtc(new Date("2026-08-04T19:59:31.123Z"))).toEqual(
      d("2026-08-04"),
    );
  });

  it("dos instantes del mismo día caen en el mismo punto", () => {
    // De esto depende que "dos cambios el mismo día" se detecte: si quedara
    // la hora, diferirían por milisegundos y convivirían.
    expect(diaUtc(new Date("2026-07-13T03:15:00.000Z")).getTime()).toBe(
      diaUtc(new Date("2026-07-13T03:15:00.001Z")).getTime(),
    );
  });
});
