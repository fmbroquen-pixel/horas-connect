import { getSesionActual } from "@/lib/auth";
import type { Usuario } from "@/generated/prisma/client";

// Usar dentro de Server Actions y páginas de /admin para asegurar que
// solo un usuario con rol "admin" pueda leer o modificar datos maestros.
export async function requireAdmin(): Promise<Usuario> {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado" || sesion.usuario.rol !== "admin") {
    throw new Error("No autorizado: se requiere rol de administrador.");
  }
  return sesion.usuario;
}
