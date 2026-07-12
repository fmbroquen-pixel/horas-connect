"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const FacturacionSchema = z.object({
  clienteId: z.string().min(1),
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  montoUsd: z.coerce.number().min(0, { error: "El monto no puede ser negativo." }),
});

export async function guardarFacturacion(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const parsed = FacturacionSchema.safeParse({
    clienteId: formData.get("clienteId"),
    anio: formData.get("anio"),
    mes: formData.get("mes"),
    montoUsd: formData.get("montoUsd"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { clienteId, anio, mes, montoUsd } = parsed.data;

  await prisma.facturacion.upsert({
    where: { clienteId_anio_mes: { clienteId, anio, mes } },
    update: { montoUsd },
    create: { clienteId, anio, mes, montoUsd },
  });

  revalidatePath("/rentabilidad");
  return { ok: true };
}

export async function guardarNotaMes(
  anio: number,
  mes: number,
  _prevState: unknown,
  formData: FormData,
): Promise<{ ok?: boolean }> {
  await requireAdmin();
  const texto = String(formData.get("texto") ?? "").trim();

  if (texto === "") {
    await prisma.notaMes.deleteMany({ where: { anio, mes } });
  } else {
    await prisma.notaMes.upsert({
      where: { anio_mes: { anio, mes } },
      update: { texto },
      create: { anio, mes, texto },
    });
  }

  revalidatePath("/rentabilidad");
  return { ok: true };
}
