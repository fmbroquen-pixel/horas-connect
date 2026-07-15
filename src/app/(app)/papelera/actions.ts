"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuest } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto } from "@/lib/formato";
import { RETENCION_DIAS } from "./constantes";

export type TipoEliminado = "hora" | "viatico" | "vacacion";

export type ItemEliminado = {
  tipo: TipoEliminado;
  seccion: string;
  id: string;
  resumen: string;
  eliminadoEn: string; // ISO
  diasRestantes: number; // hasta el borrado automático
};

function fmt(d: Date) {
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function diasRestantes(eliminadoEn: Date): number {
  const transcurridos = Math.floor(
    (Date.now() - eliminadoEn.getTime()) / 86400000,
  );
  return Math.max(0, RETENCION_DIAS - transcurridos);
}

// Lista los eliminados de un módulo: cada usuario ve los suyos; el admin ve
// todos. Ordenados por fecha de eliminación (más reciente primero).
export async function listarEliminados(
  tipo: TipoEliminado,
): Promise<ItemEliminado[]> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  const scope = esAdmin ? {} : { usuarioId: usuario.id };

  if (tipo === "hora") {
    const horas = await prisma.registroHoras.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      include: { cliente: true },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    });
    return horas.map((h) => ({
      tipo: "hora" as const,
      seccion: "Time Tracking",
      id: h.id,
      resumen: `${fmt(h.fecha)} · ${h.cliente.nombre} · ${formatHorasHsMin(Number(h.horas))} hs`,
      eliminadoEn: h.eliminadoEn!.toISOString(),
      diasRestantes: diasRestantes(h.eliminadoEn!),
    }));
  }

  if (tipo === "viatico") {
    const viaticos = await prisma.viatico.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      include: { cliente: true },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    });
    return viaticos.map((v) => ({
      tipo: "viatico" as const,
      seccion: "Expenses",
      id: v.id,
      resumen: `${fmt(v.fecha)} · ${v.cliente.nombre} · ${v.moneda} ${formatMonto(Number(v.monto))}`,
      eliminadoEn: v.eliminadoEn!.toISOString(),
      diasRestantes: diasRestantes(v.eliminadoEn!),
    }));
  }

  const vacaciones = await prisma.vacacion.findMany({
    where: { eliminadoEn: { not: null }, ...scope },
    orderBy: { eliminadoEn: "desc" },
    take: 100,
  });
  return vacaciones.map((v) => ({
    tipo: "vacacion" as const,
    seccion: "Time Off",
    id: v.id,
    resumen: `${fmt(v.fechaInicio)}–${fmt(v.fechaFin)} · ${v.dias} días`,
    eliminadoEn: v.eliminadoEn!.toISOString(),
    diasRestantes: diasRestantes(v.eliminadoEn!),
  }));
}

export async function restaurarItem(
  tipo: TipoEliminado,
  id: string,
): Promise<void> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  const scope = esAdmin ? {} : { usuarioId: usuario.id };
  const data = { eliminadoEn: null };

  if (tipo === "hora") {
    await prisma.registroHoras.updateMany({ where: { id, ...scope }, data });
    revalidatePath("/timetracker");
    revalidatePath("/dashboard");
  } else if (tipo === "viatico") {
    await prisma.viatico.updateMany({ where: { id, ...scope }, data });
    revalidatePath("/viaticos");
  } else {
    await prisma.vacacion.updateMany({ where: { id, ...scope }, data });
    revalidatePath("/vacaciones");
    revalidatePath("/dashboard");
  }
}
