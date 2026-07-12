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
