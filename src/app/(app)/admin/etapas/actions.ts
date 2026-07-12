"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const EtapaSchema = z.object({
  etiqueta: z.string().trim().min(1, { error: "La etiqueta es obligatoria." }),
  grupo: z.string().trim().min(1, { error: "El grupo es obligatorio." }),
});

export async function crearEtapa(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = EtapaSchema.safeParse({
    etiqueta: formData.get("etiqueta"),
    grupo: formData.get("grupo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const ultima = await prisma.etapa.findFirst({ orderBy: { orden: "desc" } });
  await prisma.etapa.create({
    data: { ...parsed.data, orden: (ultima?.orden ?? 0) + 1 },
  });
  revalidatePath("/admin/etapas");
  return { error: undefined };
}

export async function actualizarEtapa(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = EtapaSchema.safeParse({
    etiqueta: formData.get("etiqueta"),
    grupo: formData.get("grupo"),
  });
  if (!parsed.success) return;

  await prisma.etapa.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/etapas");
}

export async function alternarActivoEtapa(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.etapa.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/etapas");
}
