import { describe, expect, it } from "vitest";
import {
  cobradoDelMes,
  construirReporte,
  type ClienteCobro,
  type RegistroDelMes,
} from "./rentabilidad-calculo";

const NOMBRES = new Map([
  ["acme", "ACME"],
  ["beta", "Beta"],
  ["gama", "Gama"],
]);

const reg = (
  clienteId: string,
  usuarioId: string,
  horas: number,
  montoUsd: number,
  modalidad = "presencial",
): RegistroDelMes => ({
  clienteId,
  usuarioId,
  usuarioNombre: usuarioId.toUpperCase(),
  modalidad,
  horas,
  montoUsd,
});

// Un cliente que cobra su cuota en el mes del informe. Sin ventana de contrato
// salvo que el test la necesite: acá interesa el cálculo, no la vigencia.
const cli = (clienteId: string, valorCuotaUsd: number): ClienteCobro => ({
  clienteId,
  valorCuotaUsd,
  fechaInicio: null,
  inactivadoEn: null,
});

// El mes del informe en todos los tests que no prueban vigencia.
const ANIO = 2026;
const MES = 7;

describe("construirReporte · margen", () => {
  it("el margen es cobrado menos costo", () => {
    const r = construirReporte(
      [reg("acme", "ana", 10, 350)],
      [cli("acme", 1000)],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasProyecto[0]).toMatchObject({
      nombre: "ACME",
      cobrado: 1000,
      costo: 350,
      margen: 650,
      margenPct: 65,
      horas: 10,
    });
    expect(r.kpis.margen).toBe(650);
  });

  it("sin facturación el porcentaje es null, no -100%", () => {
    // Que un proyecto no tenga factura cargada no significa que perdió toda
    // la plata: significa que todavía no se sabe. Mostrar un porcentaje ahí
    // seria afirmar algo falso.
    const r = construirReporte([reg("acme", "ana", 10, 350)], [], ANIO,
      MES,
      NOMBRES);
    expect(r.filasProyecto[0].margen).toBe(-350);
    expect(r.filasProyecto[0].margenPct).toBeNull();
    expect(r.kpis.margenPct).toBeNull();
  });

  it("un proyecto cobrado sin horas del mes sigue apareciendo", () => {
    // Es margen puro y es justo lo que no puede faltar en el informe.
    const r = construirReporte([], [cli("beta", 500)], ANIO,
      MES,
      NOMBRES);
    expect(r.filasProyecto).toHaveLength(1);
    expect(r.filasProyecto[0]).toMatchObject({
      nombre: "Beta",
      cobrado: 500,
      costo: 0,
      margen: 500,
      horas: 0,
    });
  });

  it("los proyectos se ordenan por margen, de mayor a menor", () => {
    const r = construirReporte(
      [reg("acme", "ana", 10, 350), reg("beta", "ana", 2, 70)],
      [cli("acme", 400), cli("beta", 1000)],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasProyecto.map((f) => f.nombre)).toEqual(["Beta", "ACME"]);
  });
});

describe("construirReporte · qué cuenta como actividad", () => {
  it("un proyecto con horas de costo cero no se pierde", () => {
    // Se trabajó: tiene que estar en el informe aunque no cueste nada, si no
    // esas horas desaparecen de la vista.
    const r = construirReporte(
      [reg("gama", "ana", 4, 0, "valor_cero")],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasProyecto).toHaveLength(1);
    expect(r.filasProyecto[0]).toMatchObject({ nombre: "Gama", costo: 0, horas: 4 });
    // El KPI cuenta clientes VIGENTES, no filas del informe: acá no se pasó
    // ninguno, así que es cero aunque haya una fila. Son dos preguntas
    // distintas y el número las separa a propósito.
    expect(r.kpis.clientesActivos).toBe(0);
  });

  it("las horas que no cuestan nada no son facturables", () => {
    const r = construirReporte(
      [reg("acme", "ana", 10, 350), reg("gama", "ana", 4, 0, "valor_cero")],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.kpis.horas).toBe(14);
    expect(r.kpis.horasFacturables).toBe(10);
  });

  it("un mes sin nada da todo en cero y sin porcentaje", () => {
    const r = construirReporte([], [], ANIO,
      MES,
      NOMBRES);
    expect(r.kpis).toEqual({
      clientesActivos: 0,
      cobrado: 0,
      margen: 0,
      margenPct: null,
      horas: 0,
      horasFacturables: 0,
    });
    expect(r.filasProyecto).toEqual([]);
    expect(r.filasMentor).toEqual([]);
  });

  it("un proyecto no se cuenta dos veces por tener horas y factura", () => {
    const r = construirReporte(
      [reg("acme", "ana", 10, 350)],
      [cli("acme", 1000)],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.kpis.clientesActivos).toBe(1);
  });
});

describe("construirReporte · mentores", () => {
  it("suma horas y honorarios, y saca el USD por hora", () => {
    const r = construirReporte(
      [reg("acme", "ana", 6, 210), reg("acme", "ana", 4, 140)],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasMentor[0]).toMatchObject({
      nombre: "ANA",
      horas: 10,
      honorarios: 350,
      usdPorHora: 35,
    });
  });

  it("cuenta clientes distintos, no registros", () => {
    const r = construirReporte(
      [reg("acme", "ana", 2, 70), reg("acme", "ana", 3, 105), reg("beta", "ana", 1, 35)],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasMentor[0].proyectos).toBe(2);
  });

  it("un mentor con horas gratis tiene USD/hora en cero, no null", () => {
    // null esta reservado para "no tiene horas"; cero es un dato real.
    const r = construirReporte(
      [reg("gama", "leo", 4, 0, "valor_cero")],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasMentor[0]).toMatchObject({ horas: 4, honorarios: 0, usdPorHora: 0 });
  });

  it("se ordenan por honorarios, de mayor a menor", () => {
    const r = construirReporte(
      [reg("acme", "ana", 2, 70), reg("acme", "leo", 10, 350)],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasMentor.map((m) => m.nombre)).toEqual(["LEO", "ANA"]);
  });
});

describe("construirReporte · gráfico apilado", () => {
  it("una columna por proyecto con horas y un cero donde el mentor no trabajó", () => {
    const r = construirReporte(
      [reg("acme", "ana", 10, 350), reg("beta", "leo", 5, 175)],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.horasStack.proyectos).toHaveLength(2);
    // Cada serie cubre TODAS las columnas: si una viniera corta, la barra de
    // ese mentor se dibujaria contra el proyecto equivocado.
    for (const m of r.horasStack.mentores) {
      expect(m.horas).toHaveLength(r.horasStack.proyectos.length);
    }
    const ana = r.horasStack.mentores.find((m) => m.nombre === "ANA")!;
    const iAcme = r.horasStack.proyectos.indexOf("ACME");
    const iBeta = r.horasStack.proyectos.indexOf("Beta");
    expect(ana.horas[iAcme]).toBe(10);
    expect(ana.horas[iBeta]).toBe(0);
  });

  it("un proyecto solo cobrado no entra al apilado", () => {
    const r = construirReporte(
      [reg("acme", "ana", 10, 350)],
      [cli("beta", 500)],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.filasProyecto).toHaveLength(2);
    expect(r.horasStack.proyectos).toEqual(["ACME"]);
  });
});

describe("construirReporte · modalidades", () => {
  it("agrupa por modalidad con su etiqueta y ordena por horas", () => {
    const r = construirReporte(
      [
        reg("acme", "ana", 2, 70, "virtual"),
        reg("acme", "ana", 8, 280, "presencial"),
        reg("acme", "ana", 1, 35, "virtual"),
      ],
      [],
      ANIO,
      MES,
      NOMBRES,
    );
    expect(r.totalesModalidad).toEqual([
      { modalidad: "Presencial", horas: 8 },
      { modalidad: "Virtual", horas: 3 },
    ]);
  });

  it("una modalidad desconocida se muestra tal cual en vez de desaparecer", () => {
    const r = construirReporte([reg("acme", "ana", 1, 35, "hibrida")], [], ANIO,
      MES,
      NOMBRES);
    expect(r.totalesModalidad).toEqual([{ modalidad: "hibrida", horas: 1 }]);
  });
});

describe("construirReporte · proyectos sin nombre", () => {
  it("una facturación de un proyecto que no vino en el mapa no rompe", () => {
    const r = construirReporte([], [cli("desconocido", 100)], ANIO,
      MES,
      NOMBRES);
    expect(r.filasProyecto[0].nombre).toBe("—");
    expect(r.filasProyecto[0].cobrado).toBe(100);
  });
});

// ── Cobrado del mes ────────────────────────────────────────────────────────
//
// El ingreso es la cuota del cliente. Lo que decide si la cobra o no es la
// ventana del contrato: sin eso, un cliente que arranca en agosto aparecería
// facturando en enero, y uno dado de baja seguiría cobrando para siempre.
describe("cobradoDelMes", () => {
  const base = {
    clienteId: "acme",
    valorCuotaUsd: 1000,
    fechaInicio: new Date("2026-07-01T00:00:00Z"),
    inactivadoEn: null as Date | null,
  };

  it("cobra la cuota dentro del contrato", () => {
    expect(cobradoDelMes(base, 2026, 7)).toBe(1000);
    expect(cobradoDelMes(base, 2026, 10)).toBe(1000);
    expect(cobradoDelMes(base, 2026, 12)).toBe(1000);
  });

  it("no cobra antes de arrancar", () => {
    // El caso de Lila, que empieza en agosto: en julio no debe aparecer.
    expect(cobradoDelMes(base, 2026, 6)).toBe(0);
    expect(cobradoDelMes(base, 2025, 12)).toBe(0);
  });

  it("un cliente activo sigue cobrando aunque su contrato figure vencido", () => {
    // El caso de Cono Sur: dos meses cargados desde julio, y en septiembre
    // seguía operando. duracionMeses define cuántos tableros trimestrales se
    // siembran en el roadmap, no hasta cuándo se cobra, y nadie lo actualiza
    // al renovar. Lo que corta el ingreso es la baja del cliente.
    expect(cobradoDelMes(base, 2027, 1)).toBe(1000);
    expect(cobradoDelMes(base, 2030, 6)).toBe(1000);
  });

  it("cuota en cero no es ingreso", () => {
    // Cinco clientes están así hoy: no tienen que ensuciar el margen con un
    // ingreso de cero que además los mete en la tabla.
    expect(cobradoDelMes({ ...base, valorCuotaUsd: 0 }, 2026, 7)).toBe(0);
    expect(cobradoDelMes({ ...base, valorCuotaUsd: null }, 2026, 7)).toBe(0);
  });

  it("un cliente dado de baja cobra su último mes, no los siguientes", () => {
    // La cuota es mensual y no se prorratea: si estuvo operando parte del mes,
    // ese mes se cobró entero.
    const bajaEnAgosto = {
      ...base,
      inactivadoEn: new Date("2026-08-31T00:00:00Z"),
    };
    expect(cobradoDelMes(bajaEnAgosto, 2026, 7)).toBe(1000);
    expect(cobradoDelMes(bajaEnAgosto, 2026, 8)).toBe(1000);
    expect(cobradoDelMes(bajaEnAgosto, 2026, 9)).toBe(0);
  });



  it("sin fecha de inicio se cobra igual", () => {
    // Es preferible a esconder un ingreso real por un dato de contrato que
    // nadie cargó.
    expect(cobradoDelMes({ ...base, fechaInicio: null }, 2020, 1)).toBe(1000);
  });

  it("cruza el año sin romperse", () => {
    const arrancaEnNoviembre = {
      ...base,
      fechaInicio: new Date("2026-11-01T00:00:00Z"),
    };
    expect(cobradoDelMes(arrancaEnNoviembre, 2026, 10)).toBe(0);
    expect(cobradoDelMes(arrancaEnNoviembre, 2026, 11)).toBe(1000);
    expect(cobradoDelMes(arrancaEnNoviembre, 2027, 2)).toBe(1000);
  });
});

// ── Vigencia y presencia en el informe ─────────────────────────────────────
describe("construirReporte · quién entra al informe", () => {
  const cli2 = (
    clienteId: string,
    valorCuotaUsd: number,
    extra: Partial<ClienteCobro> = {},
  ): ClienteCobro => ({
    clienteId,
    valorCuotaUsd,
    fechaInicio: null,
    inactivadoEn: null,
    ...extra,
  });

  it("un cliente vigente sin cuota y sin horas aparece igual", () => {
    // El caso de Valos: activo, cuota en cero, ninguna hora cargada. Antes no
    // aparecía en ningún lado -ni en el KPI ni en el gráfico- así que el dato
    // que le faltaba era invisible.
    const r = construirReporte([], [cli2("acme", 0)], ANIO, MES, NOMBRES);
    expect(r.filasProyecto).toHaveLength(1);
    expect(r.filasProyecto[0]).toMatchObject({ cobrado: 0, costo: 0, horas: 0 });
    expect(r.filasProyecto[0].margenPct).toBeNull();
    expect(r.kpis.clientesActivos).toBe(1);
  });

  it("el KPI cuenta la vigencia del MES, no el estado de hoy", () => {
    // Dado de baja en agosto: cuenta en julio y no en septiembre.
    const dadoDeBaja = cli2("acme", 1000, {
      inactivadoEn: new Date("2026-08-31T00:00:00Z"),
    });
    expect(construirReporte([], [dadoDeBaja], 2026, 7, NOMBRES).kpis.clientesActivos).toBe(1);
    expect(construirReporte([], [dadoDeBaja], 2026, 8, NOMBRES).kpis.clientesActivos).toBe(1);
    expect(construirReporte([], [dadoDeBaja], 2026, 9, NOMBRES).kpis.clientesActivos).toBe(0);
  });

  it("no cuenta a los que todavía no arrancaron", () => {
    const arrancaEnAgosto = cli2("acme", 500, {
      fechaInicio: new Date("2026-08-01T00:00:00Z"),
    });
    expect(construirReporte([], [arrancaEnAgosto], 2026, 7, NOMBRES).kpis.clientesActivos).toBe(0);
    expect(construirReporte([], [arrancaEnAgosto], 2026, 8, NOMBRES).kpis.clientesActivos).toBe(1);
  });

  it("un cliente ya dado de baja con horas de ese mes no desaparece", () => {
    // Las horas son un hecho: un costo cargado no puede irse del informe
    // porque después se haya apagado al cliente. Entra a la tabla aunque no
    // cuente como vigente.
    const dadoDeBaja = cli2("acme", 1000, {
      inactivadoEn: new Date("2026-07-31T00:00:00Z"),
    });
    const r = construirReporte(
      [reg("acme", "ana", 5, 200)],
      [dadoDeBaja],
      2026,
      9,
      NOMBRES,
    );
    expect(r.filasProyecto).toHaveLength(1);
    expect(r.filasProyecto[0]).toMatchObject({ cobrado: 0, costo: 200 });
    expect(r.kpis.clientesActivos).toBe(0);
  });
});
