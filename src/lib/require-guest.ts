import { getSesionActual } from "@/lib/auth";
import type { Usuario } from "@/generated/prisma/client";

// Para las pantallas y acciones de carga del mentor (guest). El admin
// también puede usarlas (carga en nombre propio si además es mentor).
export async function requireGuest(): Promise<Usuario> {
  const sesion = await getSesionActual();
  if (
    sesion.estado !== "autorizado" ||
    (sesion.usuario.rol !== "guest" && sesion.usuario.rol !== "admin")
  ) {
    throw new Error("No autorizado.");
  }
  return sesion.usuario;
}

// El alcance de proyectos vive en un solo lado (lib/proyecto-acceso). Se
// re-exporta acá porque los llamadores de carga de horas ya importaban las
// dos cosas de este módulo y separarlas no aportaba nada.
export { getProyectosPermitidos } from "@/lib/proyecto-acceso";
