import { prisma } from "@/lib/prisma";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { getProyectosVisibles } from "@/lib/proyectos";
import { construirReporte } from "@/lib/rentabilidad-calculo";
import type { Usuario } from "@/generated/prisma/client";

export type {
  FilaProyecto,
  FilaMentor,
  TotalModalidad,
  HorasStack,
} from "@/lib/rentabilidad-calculo";

import type { Calculo } from "@/lib/rentabilidad-calculo";

export type Reporte = Calculo & {
  anio: number;
  mes: number;
  esAdmin: boolean;
  nota: string;
};

// Trae lo del mes y delega el cálculo. La división es a propósito: acá van las
// consultas y en rentabilidad-calculo las reglas de plata, que son las que
// conviene poder probar sin base.
export async function calcularReporte(
  usuario: Usuario,
  anio: number,
  mes: number,
): Promise<Reporte> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1)); // exclusivo

  // Con el inicio del mes: un cliente inactivado despues sigue siendo parte de
  // este informe. Sin eso, apagarlo le borraba la facturacion y el margen de
  // todos los meses en que si opero.
  const proyectos = await getProyectosVisibles(
    usuario,
    desde.toISOString().slice(0, 10),
  );
  const proyectoIds = proyectos.map((p) => p.id);
  const nombrePorProyecto = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const [registros, facturaciones, notaMes] = await Promise.all([
    prisma.registroHoras.findMany({
      where: {
        clienteId: { in: proyectoIds },
        fecha: { gte: desde, lt: hasta },
        ...SOLO_ACTIVOS,
      },
      select: {
        clienteId: true,
        usuarioId: true,
        modalidad: true,
        horas: true,
        montoUsd: true,
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.facturacion.findMany({
      where: { clienteId: { in: proyectoIds }, anio, mes },
      select: { clienteId: true, montoUsd: true },
    }),
    prisma.notaMes.findUnique({ where: { anio_mes: { anio, mes } } }),
  ]);

  const calculo = construirReporte(
    registros.map((r) => ({
      clienteId: r.clienteId,
      usuarioId: r.usuarioId,
      usuarioNombre: r.usuario.nombre,
      modalidad: r.modalidad,
      horas: Number(r.horas),
      montoUsd: Number(r.montoUsd),
    })),
    facturaciones.map((f) => ({
      clienteId: f.clienteId,
      montoUsd: Number(f.montoUsd),
    })),
    nombrePorProyecto,
  );

  return {
    ...calculo,
    anio,
    mes,
    esAdmin: usuario.rol === "admin",
    nota: notaMes?.texto ?? "",
  };
}
