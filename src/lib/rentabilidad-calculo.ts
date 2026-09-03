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

// Lo que un cliente cobra en un mes.
//
// El ingreso es la CUOTA del cliente, no una factura cargada aparte. La tabla
// de facturaciones existía para eso y quedó vacía: nadie cargó nunca un monto,
// así que Analytics venía mostrando cero de ingreso y cero de margen en todos
// los meses. El dato que sí está cargado, en los veinte clientes, es la cuota.
export type ClienteCobro = {
  clienteId: string;
  valorCuotaUsd: number | null;
  // Desde cuándo opera. Sin esto la cuota se cobraría en todos los meses de la
  // historia, incluidos los anteriores al arranque: un cliente que empieza en
  // agosto aparecería facturando en julio.
  fechaInicio: Date | null;
  // Si dejó de operar, desde cuándo. Un cliente apagado no cobra los meses
  // posteriores a su baja, aunque su contrato siguiera corriendo en el papel.
  inactivadoEn: Date | null;
};

// Índice de mes absoluto (año * 12 + mes), para comparar sin pelear con fechas.
function indiceMes(anio: number, mes: number): number {
  return anio * 12 + (mes - 1);
}

function indiceDe(fecha: Date): number {
  return indiceMes(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1);
}

// ¿Este cliente operaba en este mes?
//
// Es la vigencia HISTORICA y no el estado de hoy: un cliente dado de baja en
// agosto operaba en julio, y el informe de julio tiene que contarlo. Sin esto,
// apagar un cliente le borraba retroactivamente todos los meses en que sí
// estuvo.
//
// El corte es por MES y no por día en las dos puntas: los informes son
// mensuales, así que un cliente que arrancó el 20 de julio operó en julio, y
// uno dado de baja el 31 de agosto operó en agosto.
export function vigenteEnElMes(
  c: ClienteCobro,
  anio: number,
  mes: number,
): boolean {
  const objetivo = indiceMes(anio, mes);
  // Sin fecha de inicio no hay ventana que verificar. Es preferible a esconder
  // un cliente real por un dato de contrato sin cargar.
  if (c.fechaInicio && objetivo < indiceDe(c.fechaInicio)) return false;
  if (c.inactivadoEn && objetivo > indiceDe(c.inactivadoEn)) return false;
  return true;
}

// Cuánto cobra este cliente en este mes: su cuota, si estaba vigente.
//
// Lo que corta el ingreso es la BAJA del cliente, no el fin de su contrato.
// `duracionMeses` existe para otra cosa -define cuántos tableros trimestrales
// se siembran en el roadmap- y es un dato de planificación que nadie actualiza
// cuando un contrato se renueva. Usarlo acá hacía que la facturación se apagara
// sola: Cono Sur figuraba con dos meses desde julio y desaparecía del informe de
// septiembre estando activo y operando.
export function cobradoDelMes(
  c: ClienteCobro,
  anio: number,
  mes: number,
): number {
  const cuota = Number(c.valorCuotaUsd ?? 0);
  if (cuota <= 0) return 0;
  if (!vigenteEnElMes(c, anio, mes)) return 0;
  return cuota;
}

export type FilaProyecto = {
  clienteId: string;
  nombre: string;
  // Un cliente inactivo aparece en el informe del mes en que operaba, pero no
  // acepta carga de datos: se mira.
  activo: boolean;
  cobrado: number;
  costo: number;
  margen: number;
  margenPct: number | null; // null = sin ingreso
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
  // Clientes vigentes en el mes del informe.
  clientesActivos: number;
  cobrado: number;
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
  // Los clientes del período con su cuota y su ventana de contrato. El ingreso
  // sale de acá: cada uno cobra su cuota en los meses en que operó.
  clientes: ClienteCobro[],
  anio: number,
  mes: number,
  nombrePorProyecto: Map<string, string>,
  activoPorProyecto: Map<string, boolean> = new Map(),
): Calculo {
  const cobradoPorProyecto = new Map<string, number>();
  // Los que operaban ese mes, cobren o no. Un cliente vigente sin cuota cargada
  // y sin horas sigue siendo un cliente vigente: tiene que estar en el informe,
  // con cero, para que se vea que le falta la cuota. Escondiéndolo, el dato
  // faltante era invisible.
  const vigentes = new Set<string>();
  for (const c of clientes) {
    if (vigenteEnElMes(c, anio, mes)) vigentes.add(c.clienteId);
    const cobrado = cobradoDelMes(c, anio, mes);
    if (cobrado > 0) cobradoPorProyecto.set(c.clienteId, cobrado);
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

  // Al informe entran los VIGENTES del mes, más cualquiera que haya tenido
  // horas o cobrado aunque ya no lo esté.
  //
  // Antes entraban solo los que tenían horas o cobraban, y eso escondía a los
  // vigentes sin ninguna de las dos: Valos figuraba activo y no aparecía en
  // ningún lado, ni en el KPI ni en el gráfico. Las horas se suman igual porque
  // son un hecho: un costo cargado no puede desaparecer del informe porque el
  // cliente se haya dado de baja después.
  const idsDelInforme = new Set<string>([
    ...vigentes,
    ...costoPorProyecto.keys(),
    ...cobradoPorProyecto.keys(),
  ]);

  const filasProyecto: FilaProyecto[] = [...idsDelInforme]
    .map((id) => {
      const cobrado = cobradoPorProyecto.get(id) ?? 0;
      const costo = costoPorProyecto.get(id) ?? 0;
      const margen = cobrado - costo;
      return {
        clienteId: id,
        nombre: nombrePorProyecto.get(id) ?? "—",
        // Por defecto activo: quien no pasa el mapa -los tests- no esta
        // probando esta regla y no tiene por que declararla.
        activo: activoPorProyecto.get(id) ?? true,
        cobrado,
        costo,
        margen,
        // Sin ingreso no hay porcentaje: dividir por cero daría -Infinity, y
        // mostrar "-100%" seria afirmar algo que no se sabe -puede que el
        // cliente todavia no tenga cuota cargada-.
        margenPct: cobrado > 0 ? (margen / cobrado) * 100 : null,
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
  // Los proyectos que solo cobraron quedan afuera; sin horas no
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

  const cobradoTotal = filasProyecto.reduce((a, f) => a + f.cobrado, 0);
  const costoTotal = filasProyecto.reduce((a, f) => a + f.costo, 0);
  const margenTotal = cobradoTotal - costoTotal;

  return {
    kpis: {
      // Los clientes que operaban ese mes según su vigencia histórica, no los
      // que están activos hoy.
      clientesActivos: vigentes.size,
      cobrado: cobradoTotal,
      margen: margenTotal,
      margenPct: cobradoTotal > 0 ? (margenTotal / cobradoTotal) * 100 : null,
      horas: horasTotales,
      horasFacturables,
    },
    filasProyecto,
    filasMentor,
    totalesModalidad,
    horasStack,
  };
}
