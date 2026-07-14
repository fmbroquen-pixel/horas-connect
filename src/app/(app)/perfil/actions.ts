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

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB (la imagen ya llega comprimida)

// Cualquier usuario autorizado (guest, admin o reader) puede subir su propia
// foto de perfil. Toda la lógica va envuelta en try/catch para que un fallo
// nunca tumbe la página: siempre devolvemos un mensaje amigable.
export async function subirAvatar(
  _prevState: unknown,
  formData: FormData,
): Promise<ResultadoAvatar> {
  try {
    const sesion = await getSesionActual();
    if (sesion.estado !== "autorizado") {
      return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
    }
    const usuario = sesion.usuario;

    const archivo = formData.get("avatar");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { error: "Elegí una imagen." };
    }
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return { error: "Formato no permitido. Usá JPG, PNG o WebP." };
    }
    if (archivo.size > MAX_BYTES) {
      return { error: "La imagen es demasiado grande (máx. 8 MB)." };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { error: "El almacenamiento no está configurado. Avisá al administrador." };
    }

    await asegurarBucketAvatares();
    const supabase = createAdminClient();

    // Ruta única por subida: al cambiar la URL, el navegador nunca muestra la
    // foto vieja cacheada. Guardamos la anterior para borrarla después.
    const anterior = usuario.avatarPath;
    const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const path = `${usuario.id}/${Date.now()}.${ext}`;

    const { error: errorUpload } = await supabase.storage
      .from(BUCKET_AVATARES)
      .upload(path, archivo, { upsert: true, contentType: archivo.type });
    if (errorUpload) {
      // No tocamos la base: se conserva la foto anterior.
      return { error: "No se pudo subir la imagen. Probá de nuevo." };
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { avatarPath: path },
    });

    // Borrado best-effort de la foto anterior (no bloquea si falla).
    if (anterior && anterior !== path) {
      supabase.storage
        .from(BUCKET_AVATARES)
        .remove([anterior])
        .catch(() => {});
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { error: "Ocurrió un error al subir la imagen. Probá de nuevo." };
  }
}
