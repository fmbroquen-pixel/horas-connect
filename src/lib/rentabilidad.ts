import { prisma } from "@/lib/prisma";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { construirReporte } from "@/lib/rentabilidad-calculo";
import type { Scope } from "@/lib/scope";
import type { Usuario } from "@/generated/prisma/client";

export type {
  FilaProyecto,
  FilaMentor,
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
//
// Los proyectos NO se resuelven acá: llegan en el scope de la pantalla, ya
// filtrados por mes, por proyectos elegidos y por Mentor Owner. Así los KPIs,
// el margen y las horas miran exactamente el mismo recorte que el resto de
// Analytics, y no hay dos lugares donde decidir qué entra.
export async function calcularReporte(
  usuario: Usuario,
  scope: Scope,
): Promise<Reporte> {
  const { anio, mes } = scope;
  // El mes ENTERO, aunque esté en curso: Analytics es un informe mensual y la
  // cuota de un cliente no se prorratea por los días que van.
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1)); // exclusivo

  const enScope = new Set(scope.ids);
  // El scope trae la ficha completa de cada cliente -cuota, inicio y baja-, así
  // que el informe no vuelve a consultarlos.
  const clientes = scope.clientes.filter((c) => enScope.has(c.id));
  const nombrePorProyecto = new Map(clientes.map((c) => [c.id, c.nombre]));
  const activoPorProyecto = new Map(clientes.map((c) => [c.id, c.activo]));

  const [registros, notaMes] = await Promise.all([
    prisma.registroHoras.findMany({
      where: {
        clienteId: { in: scope.ids },
        fecha: { gte: desde, lt: hasta },
        ...SOLO_ACTIVOS,
      },
      select: {
        clienteId: true,
        usuarioId: true,
        horas: true,
        montoUsd: true,
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.notaMes.findUnique({ where: { anio_mes: { anio, mes } } }),
  ]);

  const calculo = construirReporte(
    registros.map((r) => ({
      clienteId: r.clienteId,
      usuarioId: r.usuarioId,
      usuarioNombre: r.usuario.nombre,
      horas: Number(r.horas),
      montoUsd: Number(r.montoUsd),
    })),
    // El ingreso sale de la CUOTA del cliente, no de una factura cargada
    // aparte. La tabla de facturaciones existía para eso y quedó vacía: nadie
    // cargó nunca un monto, así que el informe venía mostrando cero de ingreso
    // y cero de margen en todos los meses.
    clientes.map((c) => ({
      clienteId: c.id,
      valorCuotaUsd: c.valorCuotaUsd === null ? null : Number(c.valorCuotaUsd),
      fechaInicio: c.fechaInicio,
      inactivadoEn: c.inactivadoEn,
    })),
    anio,
    mes,
    nombrePorProyecto,
    activoPorProyecto,
  );

  return {
    ...calculo,
    anio,
    mes,
    esAdmin: usuario.rol === "admin",
    nota: notaMes?.texto ?? "",
  };
}
