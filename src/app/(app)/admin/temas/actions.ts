"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const TemaSchema = z.object({
  etiqueta: z.string().trim().min(1, { error: "La etiqueta es obligatoria." }),
  grupo: z.string().trim().min(1, { error: "El grupo es obligatorio." }),
});

export async function crearTema(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = TemaSchema.safeParse({
    etiqueta: formData.get("etiqueta"),
    grupo: formData.get("grupo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const ultimo = await prisma.tema.findFirst({ orderBy: { orden: "desc" } });
  await prisma.tema.create({
    data: { ...parsed.data, orden: (ultimo?.orden ?? 0) + 1 },
  });
  revalidatePath("/admin/temas");
  return { error: undefined };
}

export async function actualizarTema(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = TemaSchema.safeParse({
    etiqueta: formData.get("etiqueta"),
    grupo: formData.get("grupo"),
  });
  if (!parsed.success) return;

  await prisma.tema.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/temas");
}

export async function alternarActivoTema(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.tema.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/temas");
}
