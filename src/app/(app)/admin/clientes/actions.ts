"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const ClienteSchema = z.object({
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
});

export async function crearCliente(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = ClienteSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.cliente.create({ data: { nombre: parsed.data.nombre } });
  revalidatePath("/admin/clientes");
  return { error: undefined };
}

export async function actualizarCliente(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = ClienteSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) return;

  await prisma.cliente.update({
    where: { id },
    data: { nombre: parsed.data.nombre },
  });
  revalidatePath("/admin/clientes");
}

export async function alternarActivoCliente(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.cliente.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/clientes");
}
