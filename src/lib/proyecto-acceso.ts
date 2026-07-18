import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import type { Cliente, Usuario } from "@/generated/prisma/client";

// Sección Proyectos: un "proyecto" es un cliente activo. La visibilidad usa
// la MISMA regla que la carga de horas (getProyectosPermitidos), para que lo
// que un mentor ve en Proyectos coincida exactamente con lo que puede cargar
// en Time Tracking. El admin ve todos los clientes activos.
export async function getClientesProyectos(usuario: Usuario): Promise<Cliente[]> {
  if (usuario.rol === "admin") {
    return prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
  }
  return getProyectosPermitidos(usuario.id);
}

// Acceso a un proyecto puntual. Devuelve null si el usuario no está
// autorizado (rol reader, sin sesión o cliente no asignado/inactivo).
export async function getAccesoProyecto(
  clienteId: string,
): Promise<{ usuario: Usuario; cliente: Cliente } | null> {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") return null;
  const { usuario } = sesion;
  if (usuario.rol !== "admin" && usuario.rol !== "guest") return null;

  const permitidos = await getClientesProyectos(usuario);
  const cliente = permitidos.find((c) => c.id === clienteId);
  return cliente ? { usuario, cliente } : null;
}
