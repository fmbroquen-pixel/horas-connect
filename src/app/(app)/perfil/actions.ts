"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import {
  createAdminClient,
  asegurarBucketAvatares,
  BUCKET_AVATARES,
} from "@/lib/supabase/admin";

export type ResultadoAvatar = { error?: string; ok?: boolean };

// Cualquier usuario autorizado (guest, admin o reader) puede subir su propia
// foto de perfil.
export async function subirAvatar(
  _prevState: unknown,
  formData: FormData,
): Promise<ResultadoAvatar> {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") return { error: "No autorizado." };
  const usuario = sesion.usuario;

  const archivo = formData.get("avatar");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí una imagen." };
  }
  if (!archivo.type.startsWith("image/")) {
    return { error: "El archivo debe ser una imagen." };
  }
  if (archivo.size > 5 * 1024 * 1024) {
    return { error: "La imagen no puede superar los 5 MB." };
  }

  await asegurarBucketAvatares();
  const supabase = createAdminClient();
  const ext = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
  // Ruta estable por usuario (se sobrescribe al cambiar la foto).
  const path = `${usuario.id}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_AVATARES)
    .upload(path, archivo, { upsert: true, contentType: archivo.type });
  if (error) {
    return { error: "No se pudo subir la imagen. Probá de nuevo." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { avatarPath: path },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
