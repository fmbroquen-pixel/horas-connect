import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import type { Cliente, Usuario } from "@/generated/prisma/client";

// ── Alcance de proyectos ───────────────────────────────────────────────────
//
// Toda la app pregunta lo mismo con distintas palabras: "qué proyectos ve
// esta persona". Vivía en cuatro funciones parecidas —una por pantalla— y las
// reglas se les fueron separando: una tenía un fallback que las otras no, y
// el mismo usuario veía cosas distintas en el Home y en Proyectos.
//
// Ahora hay una sola implementación y las variantes son parámetros:
//
//   · admin  → todos los clientes del estado pedido, tenga o no asignaciones.
//              Administra el portafolio completo; ponerlo como Owner de un
//              proyecto no puede achicarle la vista al resto.
//   · resto  → exactamente los que le asignó el admin. Sin asignaciones la
//              lista es VACÍA: un permiso no se amplía por ausencia de datos.

type Alcance = {
  // true = proyectos activos (el default), false = la sección Inactivos.
  activo?: boolean;
  // Solo las asignaciones con rol declarado (Owner o Backup). Es el alcance
  // del Home de CORE: ahí la pregunta no es "dónde puedo cargar horas" sino
  // "de qué proyectos soy responsable".
  soloConRol?: boolean;
};

async function clientesDeUsuario(
  usuarioId: string,
  rolUsuario: string,
  { activo = true, soloConRol = false }: Alcance = {},
): Promise<Cliente[]> {
  if (rolUsuario === "admin") {
    return prisma.cliente.findMany({ where: { activo }, orderBy: { nombre: "asc" } });
  }

  const asignados = await prisma.proyectoAsignado.findMany({
    where: { usuarioId, ...(soloConRol ? { rol: { not: null } } : {}) },
    include: { cliente: true },
  });
  return asignados
    .map((a) => a.cliente)
    .filter((c) => c.activo === activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function rolDe(usuarioId: string): Promise<string> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true },
  });
  return usuario?.rol ?? "";
}

// Proyectos activos que un usuario puede VER en la sección Proyectos. Misma
// regla que la carga de horas (getProyectosPermitidos), para que lo que un
// mentor ve acá coincida con lo que puede cargar en Time Tracking.
export function getClientesProyectos(usuario: Usuario): Promise<Cliente[]> {
  return clientesDeUsuario(usuario.id, usuario.rol);
}

// Contraparte para la sección "Inactivos" del desplegable de Proyectos.
export function getClientesProyectosInactivos(usuario: Usuario): Promise<Cliente[]> {
  return clientesDeUsuario(usuario.id, usuario.rol, { activo: false });
}

// Proyectos donde el usuario tiene un rol declarado (Mentor Owner o Backup).
// Es el alcance del Home de CORE.
export async function getProyectosConRol(usuarioId: string): Promise<Cliente[]> {
  return clientesDeUsuario(usuarioId, await rolDe(usuarioId), { soloConRol: true });
}

// Proyectos en los que un usuario puede CARGAR horas. Recibe el id porque un
// admin puede estar cargando en nombre de otro y ahí el alcance es el del
// destino, no el suyo.
export async function getProyectosPermitidos(usuarioId: string): Promise<Cliente[]> {
  return clientesDeUsuario(usuarioId, await rolDe(usuarioId));
}

// Proyectos visibles en los reportes de rentabilidad. El guest no usa esta
// vista; el reader ve solo los que le asignaron.
export function getProyectosVisibles(usuario: Usuario): Promise<Cliente[]> {
  return clientesDeUsuario(usuario.id, usuario.rol);
}

// Acceso a un proyecto puntual (activo o inactivo). Devuelve null si el
// usuario no está autorizado (rol reader, sin sesión o cliente no asignado).
//
// Consulta el cliente y su asignación directo, en vez de traer la lista
// completa y buscar adentro: se llama en el layout del proyecto, otra vez en
// cada pestaña y en casi todas las server actions del Follow Up.
export async function getAccesoProyecto(
  clienteId: string,
): Promise<{ usuario: Usuario; cliente: Cliente } | null> {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") return null;
  const { usuario } = sesion;
  if (usuario.rol !== "admin" && usuario.rol !== "guest") return null;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return null;
  if (usuario.rol === "admin") return { usuario, cliente };

  const asignado = await prisma.proyectoAsignado.findUnique({
    where: { usuarioId_clienteId: { usuarioId: usuario.id, clienteId } },
    select: { id: true },
  });
  return asignado ? { usuario, cliente } : null;
}
