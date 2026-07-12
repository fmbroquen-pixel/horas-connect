import { prisma } from "@/lib/prisma";
import type { Cliente, Usuario } from "@/generated/prisma/client";

// Proyectos que un usuario puede VER en los reportes de rentabilidad:
// - admin: todos los proyectos activos.
// - reader: solo los que el administrador le asignó (vacío si no tiene).
// (El guest no usa esta vista; ve su dashboard personal.)
export async function getProyectosVisibles(usuario: Usuario): Promise<Cliente[]> {
  if (usuario.rol === "admin") {
    return prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
  }

  const asignados = await prisma.proyectoAsignado.findMany({
    where: { usuarioId: usuario.id },
    include: { cliente: true },
  });
  return asignados
    .map((a) => a.cliente)
    .filter((c) => c.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
