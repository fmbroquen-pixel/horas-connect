import { getSesionActual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Usuario, Cliente } from "@/generated/prisma/client";

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

// Proyectos en los que este usuario puede cargar: los asignados por el
// administrador, o todos los activos si no tiene ninguno asignado.
export async function getProyectosPermitidos(
  usuarioId: string,
): Promise<Cliente[]> {
  const asignados = await prisma.proyectoAsignado.findMany({
    where: { usuarioId },
    include: { cliente: true },
  });
  if (asignados.length > 0) {
    return asignados
      .map((a) => a.cliente)
      .filter((c) => c.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  return prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
}
