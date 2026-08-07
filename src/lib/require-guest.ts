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

// Proyectos en los que este usuario puede cargar horas: exactamente los que
// le asignó el administrador, y nada más.
//
// Sin asignaciones la lista es VACÍA. Antes había un fallback que devolvía
// todos los activos, con la idea de que un mentor recién dado de alta pudiera
// empezar a cargar; el efecto real era el contrario de lo que se busca: al
// sacarle las asignaciones a alguien pasaba de ver sus proyectos a verlos
// todos, y podía cargarles horas. Un permiso no puede AMPLIARSE por ausencia
// de datos.
//
// Un admin sí los ve todos, tenga o no asignaciones: su rol no puede quedar
// limitado por haberlo puesto como Owner o Backup de un proyecto puntual. Se
// resuelve acá y no en cada llamador para que valga igual en las pantallas,
// en las rutas y en la validación de las server actions.
export async function getProyectosPermitidos(
  usuarioId: string,
): Promise<Cliente[]> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true },
  });
  if (usuario?.rol === "admin") {
    return prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
  }

  const asignados = await prisma.proyectoAsignado.findMany({
    where: { usuarioId },
    include: { cliente: true },
  });
  return asignados
    .map((a) => a.cliente)
    .filter((c) => c.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
