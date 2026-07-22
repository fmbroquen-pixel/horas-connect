import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import type { Cliente, Usuario } from "@/generated/prisma/client";

// Clientes con el estado (activo/inactivo) pedido, con el mismo alcance de
// visibilidad para admin/mentor en ambos casos: admin ve todos; un mentor ve
// los que tiene asignados (filtrados por ese estado), o —si no tiene ninguna
// asignación— todos los del estado pedido (mismo fallback que
// getProyectosPermitidos, generalizado al parámetro `activo`).
async function getClientesPorEstado(
  usuario: Usuario,
  activo: boolean,
): Promise<Cliente[]> {
  if (usuario.rol === "admin") {
    return prisma.cliente.findMany({
      where: { activo },
      orderBy: { nombre: "asc" },
    });
  }

  const asignados = await prisma.proyectoAsignado.findMany({
    where: { usuarioId: usuario.id },
    include: { cliente: true },
  });
  if (asignados.length > 0) {
    return asignados
      .map((a) => a.cliente)
      .filter((c) => c.activo === activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  return prisma.cliente.findMany({
    where: { activo },
    orderBy: { nombre: "asc" },
  });
}

// Proyectos activos que un usuario puede VER en la sección Proyectos: misma
// regla que la carga de horas (getProyectosPermitidos), para que lo que un
// mentor ve acá coincida con lo que puede cargar en Time Tracking.
export async function getClientesProyectos(usuario: Usuario): Promise<Cliente[]> {
  return getClientesPorEstado(usuario, true);
}

// Contraparte para la sección "Inactivos" del desplegable de Proyectos.
export async function getClientesProyectosInactivos(
  usuario: Usuario,
): Promise<Cliente[]> {
  return getClientesPorEstado(usuario, false);
}

// Acceso a un proyecto puntual (activo o inactivo). Devuelve null si el
// usuario no está autorizado (rol reader, sin sesión o cliente no
// asignado/visible).
export async function getAccesoProyecto(
  clienteId: string,
): Promise<{ usuario: Usuario; cliente: Cliente } | null> {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") return null;
  const { usuario } = sesion;
  if (usuario.rol !== "admin" && usuario.rol !== "guest") return null;

  const [activos, inactivos] = await Promise.all([
    getClientesProyectos(usuario),
    getClientesProyectosInactivos(usuario),
  ]);
  const cliente = [...activos, ...inactivos].find((c) => c.id === clienteId);
  return cliente ? { usuario, cliente } : null;
}
