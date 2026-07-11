"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const UsuarioSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  rol: z.enum(["admin", "guest"], { error: "Elegí un rol." }),
  mentorId: z.string().trim().optional(),
});

export async function crearUsuario(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const mentorId = formData.get("mentorId");
  const parsed = UsuarioSchema.safeParse({
    email: formData.get("email"),
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
    mentorId: mentorId ? String(mentorId) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.usuario.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      rol: parsed.data.rol,
      mentorId: parsed.data.mentorId || null,
    },
  });
  revalidatePath("/admin/usuarios");
  return { error: undefined };
}

export async function actualizarUsuario(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const mentorId = formData.get("mentorId");
  const parsed = UsuarioSchema.safeParse({
    email: formData.get("email"),
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
    mentorId: mentorId ? String(mentorId) : undefined,
  });
  if (!parsed.success) return;

  if (parsed.data.rol !== "admin") {
    await bloquearSiEsUltimoAdmin(id, admin.id);
  }

  await prisma.usuario.update({
    where: { id },
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      rol: parsed.data.rol,
      mentorId: parsed.data.mentorId || null,
    },
  });
  revalidatePath("/admin/usuarios");
}

export async function alternarActivoUsuario(id: string, activo: boolean) {
  const admin = await requireAdmin();
  if (!activo) {
    await bloquearSiEsUltimoAdmin(id, admin.id);
  }
  await prisma.usuario.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/usuarios");
}

// Evita que se desactive o degrade al ultimo administrador activo, lo que
// dejaria la app sin nadie que pueda volver a habilitar usuarios.
async function bloquearSiEsUltimoAdmin(usuarioId: string, adminActualId: string) {
  const objetivo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!objetivo || objetivo.rol !== "admin" || !objetivo.activo) return;

  const otrosAdmins = await prisma.usuario.count({
    where: { rol: "admin", activo: true, id: { not: usuarioId } },
  });
  if (otrosAdmins === 0) {
    throw new Error(
      usuarioId === adminActualId
        ? "No podés quitarte el rol de administrador siendo el único activo."
        : "No se puede desactivar al único administrador activo.",
    );
  }
}
