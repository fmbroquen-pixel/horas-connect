import { createClient } from "@supabase/supabase-js";

// Cliente con la clave de servicio, solo para uso en el servidor (nunca se
// importa desde componentes de cliente). Se usa para Storage (comprobantes
// de viáticos), donde las reglas de acceso las aplica nuestro propio código.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const BUCKET_COMPROBANTES = "comprobantes";
export const BUCKET_AVATARES = "avatares";

// Crea el bucket privado la primera vez que se necesita.
export async function asegurarBucketComprobantes() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET_COMPROBANTES);
  if (!data) {
    await supabase.storage.createBucket(BUCKET_COMPROBANTES, {
      public: false,
      fileSizeLimit: "10MB",
    });
  }
}

// Bucket público para las fotos de perfil (avatares).
export async function asegurarBucketAvatares() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET_AVATARES);
  if (!data) {
    await supabase.storage.createBucket(BUCKET_AVATARES, {
      public: true,
      fileSizeLimit: "5MB",
    });
  }
}

// URL pública de un avatar a partir de su ruta en el bucket.
export function urlAvatar(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_AVATARES}/${path}`;
}
