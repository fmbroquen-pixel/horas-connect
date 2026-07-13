"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuest } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto } from "@/lib/formato";

export type TipoEliminado = "hora" | "viatico" | "vacacion";

export type ItemEliminado = {
  tipo: TipoEliminado;
  seccion: string;
  id: string;
  resumen: string;
  eliminadoEn: string; // ISO
};

function fmt(d: Date) {
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

// Lista los datos en la papelera: cada usuario ve los suyos; el admin ve
// todos. Ordenados por fecha de eliminación (más reciente primero).
export async function listarEliminados(): Promise<ItemEliminado[]> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  const scope = esAdmin ? {} : { usuarioId: usuario.id };

  const [horas, viaticos, vacaciones] = await Promise.all([
    prisma.registroHoras.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      include: { cliente: true },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    }),
    prisma.viatico.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      include: { cliente: true },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    }),
    prisma.vacacion.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    }),
  ]);

  const items: ItemEliminado[] = [
    ...horas.map((h) => ({
      tipo: "hora" as const,
      seccion: "Timetracker",
      id: h.id,
      resumen: `${fmt(h.fecha)} · ${h.cliente.nombre} · ${formatHorasHsMin(Number(h.horas))} hs`,
      eliminadoEn: h.eliminadoEn!.toISOString(),
    })),
    ...viaticos.map((v) => ({
      tipo: "viatico" as const,
      seccion: "Viáticos",
      id: v.id,
      resumen: `${fmt(v.fecha)} · ${v.cliente.nombre} · ${v.moneda} ${formatMonto(Number(v.monto))}`,
      eliminadoEn: v.eliminadoEn!.toISOString(),
    })),
    ...vacaciones.map((v) => ({
      tipo: "vacacion" as const,
      seccion: "Vacaciones",
      id: v.id,
      resumen: `${fmt(v.fechaInicio)}–${fmt(v.fechaFin)} · ${v.dias} días`,
      eliminadoEn: v.eliminadoEn!.toISOString(),
    })),
  ];

  return items.sort((a, b) => b.eliminadoEn.localeCompare(a.eliminadoEn));
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
