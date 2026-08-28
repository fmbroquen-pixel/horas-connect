// El cálculo del informe mensual, sin base de datos.
//
// Está separado de rentabilidad.ts a propósito: ahí viven las consultas y acá
// las reglas de plata —qué se considera actividad, cómo sale el margen, qué
// hora cuenta como facturable— que son las que conviene poder probar sin
// levantar nada. Es el módulo donde un error cuesta más caro y era el único
// nucleo del sistema sin un solo test.

export type RegistroDelMes = {
  clienteId: string;
  usuarioId: string;
  usuarioNombre: string;
  modalidad: string;
  horas: number;
  // Lo que esa hora le cuesta a la empresa: horas × tarifa del mentor, ya
  // calculado y congelado al guardar el registro.
  montoUsd: number;
};

export type FacturacionDelMes = { clienteId: string; montoUsd: number };

export type FilaProyecto = {
  clienteId: string;
  nombre: string;
  facturado: number;
  costo: number;
  margen: number;
  margenPct: number | null; // null = sin facturación
  horas: number;
};

export type FilaMentor = {
  usuarioId: string;
  nombre: string;
  horas: number;
  honorarios: number;
  proyectos: number;
  usdPorHora: number | null;
};

export type TotalModalidad = { modalidad: string; horas: number };

export type HorasStack = {
  proyectos: string[]; // etiquetas (nombres de proyecto)
  mentores: { nombre: string; horas: number[] }[]; // una serie por mentor
};

export type Kpis = {
  proyectosConActividad: number;
  facturado: number;
  margen: number;
  margenPct: number | null;
  horas: number;
  horasFacturables: number;
};

export type Calculo = {
  kpis: Kpis;
  filasProyecto: FilaProyecto[];
  filasMentor: FilaMentor[];
  totalesModalidad: TotalModalidad[];
  horasStack: HorasStack;
};

const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  valor_cero: "Valor cero",
};

export function construirReporte(
  registros: RegistroDelMes[],
  facturaciones: FacturacionDelMes[],
  nombrePorProyecto: Map<string, string>,
): Calculo {
  const facturadoPorProyecto = new Map<string, number>();
  for (const f of facturaciones) {
    facturadoPorProyecto.set(f.clienteId, f.montoUsd);
  }

  // Agregación por proyecto (costo = suma de montoUsd de las horas).
  const costoPorProyecto = new Map<string, number>();
  const horasPorProyecto = new Map<string, number>();
  // Matriz proyecto -> mentor -> horas (para el gráfico apilado).
  const horasProyMentor = new Map<string, Map<string, number>>();
  const nombreMentor = new Map<string, string>();

  // Resumen por mentor.
  const mentorHoras = new Map<string, number>();
  const mentorHonorarios = new Map<string, number>();
  const mentorProyectos = new Map<string, Set<string>>();

  // Totales por modalidad.
  const modalidadHoras = new Map<string, number>();

  let horasTotales = 0;
  let horasFacturables = 0;

  for (const r of registros) {
    horasTotales += r.horas;
    // Una hora que no le cuesta nada a la empresa no es facturable: es el
    // caso de "Valor cero" y el de un mentor con tarifa 0.
    if (r.montoUsd > 0) horasFacturables += r.horas;

    costoPorProyecto.set(
      r.clienteId,
      (costoPorProyecto.get(r.clienteId) ?? 0) + r.montoUsd,
    );
    horasPorProyecto.set(
      r.clienteId,
      (horasPorProyecto.get(r.clienteId) ?? 0) + r.horas,
    );

    if (!horasProyMentor.has(r.clienteId)) horasProyMentor.set(r.clienteId, new Map());
    const m = horasProyMentor.get(r.clienteId)!;
    m.set(r.usuarioId, (m.get(r.usuarioId) ?? 0) + r.horas);
    nombreMentor.set(r.usuarioId, r.usuarioNombre);

    mentorHoras.set(r.usuarioId, (mentorHoras.get(r.usuarioId) ?? 0) + r.horas);
    mentorHonorarios.set(
      r.usuarioId,
      (mentorHonorarios.get(r.usuarioId) ?? 0) + r.montoUsd,
    );
    if (!mentorProyectos.has(r.usuarioId)) mentorProyectos.set(r.usuarioId, new Set());
    mentorProyectos.get(r.usuarioId)!.add(r.clienteId);

    modalidadHoras.set(r.modalidad, (modalidadHoras.get(r.modalidad) ?? 0) + r.horas);
  }

  // Un proyecto entra al informe si tuvo horas O si tuvo facturación. Las dos
  // mitades hacen falta: un proyecto que se facturó sin trabajar ese mes es
  // margen puro y no puede faltar, y uno donde se trabajó sin facturar es
  // justamente el que hay que ver.
  const idsConActividad = new Set<string>([
    ...costoPorProyecto.keys(),
    ...facturadoPorProyecto.keys(),
  ]);

  const filasProyecto: FilaProyecto[] = [...idsConActividad]
    .map((id) => {
      const facturado = facturadoPorProyecto.get(id) ?? 0;
      const costo = costoPorProyecto.get(id) ?? 0;
      const margen = facturado - costo;
      return {
        clienteId: id,
        nombre: nombrePorProyecto.get(id) ?? "—",
        facturado,
        costo,
        margen,
        // Sin facturación no hay porcentaje: dividir por cero daría -Infinity
        // y mostrar "-100%" seria afirmar algo que todavia no se sabe -puede
        // que la factura de ese mes no este cargada aun-.
        margenPct: facturado > 0 ? (margen / facturado) * 100 : null,
        horas: horasPorProyecto.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.margen - a.margen);

  const filasMentor: FilaMentor[] = [...mentorHoras.keys()]
    .map((id) => {
      const horas = mentorHoras.get(id) ?? 0;
      const honorarios = mentorHonorarios.get(id) ?? 0;
      return {
        usuarioId: id,
        nombre: nombreMentor.get(id) ?? "—",
        horas,
        honorarios,
        proyectos: mentorProyectos.get(id)?.size ?? 0,
        usdPorHora: horas > 0 ? honorarios / horas : null,
      };
    })
    .sort((a, b) => b.honorarios - a.honorarios);

  const totalesModalidad: TotalModalidad[] = [...modalidadHoras.entries()]
    .map(([modalidad, horas]) => ({
      modalidad: ETIQUETA_MODALIDAD[modalidad] ?? modalidad,
      horas,
    }))
    .sort((a, b) => b.horas - a.horas);

  // Gráfico apilado: una columna por proyecto con horas, una serie por mentor.
  // Los proyectos que solo tuvieron facturación quedan afuera; sin horas no
  // aportan nada a apilar.
  const proyectosConHoras = filasProyecto.filter((f) => f.horas > 0);
  const mentoresUnicos = [...nombreMentor.entries()]; // [id, nombre]
  const horasStack: HorasStack = {
    proyectos: proyectosConHoras.map((f) => f.nombre),
    mentores: mentoresUnicos.map(([mentorId, nombre]) => ({
      nombre,
      horas: proyectosConHoras.map(
        (f) => horasProyMentor.get(f.clienteId)?.get(mentorId) ?? 0,
      ),
    })),
  };

  const facturadoTotal = filasProyecto.reduce((a, f) => a + f.facturado, 0);
  const costoTotal = filasProyecto.reduce((a, f) => a + f.costo, 0);
  const margenTotal = facturadoTotal - costoTotal;

  return {
    kpis: {
      proyectosConActividad: idsConActividad.size,
      facturado: facturadoTotal,
      margen: margenTotal,
      margenPct: facturadoTotal > 0 ? (margenTotal / facturadoTotal) * 100 : null,
      horas: horasTotales,
      horasFacturables,
    },
    filasProyecto,
    filasMentor,
    totalesModalidad,
    horasStack,
  };
}
