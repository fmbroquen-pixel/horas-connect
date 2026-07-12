import { prisma } from "@/lib/prisma";
import { getProyectosVisibles } from "@/lib/proyectos";
import type { Usuario } from "@/generated/prisma/client";

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

export type Reporte = {
  anio: number;
  mes: number;
  esAdmin: boolean;
  kpis: {
    proyectosConActividad: number;
    clientes: number;
    facturado: number;
    margen: number;
    margenPct: number | null;
    horas: number;
    horasFacturables: number;
  };
  filasProyecto: FilaProyecto[];
  filasMentor: FilaMentor[];
  totalesModalidad: TotalModalidad[];
  horasStack: HorasStack;
  nota: string;
};

const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  valor_cero: "Valor cero",
};

export async function calcularReporte(
  usuario: Usuario,
  anio: number,
  mes: number,
): Promise<Reporte> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1)); // exclusivo

  const proyectos = await getProyectosVisibles(usuario);
  const proyectoIds = proyectos.map((p) => p.id);
  const nombrePorProyecto = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const [registros, facturaciones, notaMes] = await Promise.all([
    prisma.registroHoras.findMany({
      where: {
        clienteId: { in: proyectoIds },
        fecha: { gte: desde, lt: hasta },
      },
      include: { usuario: true },
    }),
    prisma.facturacion.findMany({
      where: { clienteId: { in: proyectoIds }, anio, mes },
    }),
    prisma.notaMes.findUnique({ where: { anio_mes: { anio, mes } } }),
  ]);

  const facturadoPorProyecto = new Map<string, number>();
  for (const f of facturaciones) {
    facturadoPorProyecto.set(f.clienteId, Number(f.montoUsd));
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
    const horas = Number(r.horas);
    const costo = Number(r.montoUsd);
    horasTotales += horas;
    if (costo > 0) horasFacturables += horas;

    costoPorProyecto.set(r.clienteId, (costoPorProyecto.get(r.clienteId) ?? 0) + costo);
    horasPorProyecto.set(r.clienteId, (horasPorProyecto.get(r.clienteId) ?? 0) + horas);

    if (!horasProyMentor.has(r.clienteId)) horasProyMentor.set(r.clienteId, new Map());
    const m = horasProyMentor.get(r.clienteId)!;
    m.set(r.usuarioId, (m.get(r.usuarioId) ?? 0) + horas);
    nombreMentor.set(r.usuarioId, r.usuario.nombre);

    mentorHoras.set(r.usuarioId, (mentorHoras.get(r.usuarioId) ?? 0) + horas);
    mentorHonorarios.set(r.usuarioId, (mentorHonorarios.get(r.usuarioId) ?? 0) + costo);
    if (!mentorProyectos.has(r.usuarioId)) mentorProyectos.set(r.usuarioId, new Set());
    mentorProyectos.get(r.usuarioId)!.add(r.clienteId);

    modalidadHoras.set(r.modalidad, (modalidadHoras.get(r.modalidad) ?? 0) + horas);
  }

  // Proyectos con actividad: tienen horas o facturación en el mes.
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

  // Gráfico apilado: filas de proyecto (con actividad de horas), una serie
  // por mentor.
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
    anio,
    mes,
    esAdmin: usuario.rol === "admin",
    kpis: {
      proyectosConActividad: idsConActividad.size,
      clientes: idsConActividad.size,
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
    nota: notaMes?.texto ?? "",
  };
}
