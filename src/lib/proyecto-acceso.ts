import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import type { Cliente, Usuario } from "@/generated/prisma/client";
import {
  clientesVisibles,
  puedeVerProyecto,
  type AlcanceClientes,
} from "@/lib/acceso";

// ── Alcance de proyectos ───────────────────────────────────────────────────
//
// Toda la app pregunta lo mismo con distintas palabras: "qué proyectos ve
// esta persona". Vivía en cuatro funciones parecidas —una por pantalla— y las
// reglas se les fueron separando: una tenía un fallback que las otras no, y
// el mismo usuario veía cosas distintas en el Home y en Proyectos.
//
// Este archivo consulta; QUIÉN VE QUÉ se decide en lib/acceso, aparte y sin
// tocar la base, para poder probarlo. Acá abajo solo se traen los datos que
// esa decisión necesita.

async function clientesDeUsuario(
  usuarioId: string,
  rolUsuario: string,
  alcance: AlcanceClientes = {},
): Promise<Cliente[]> {
  // El admin no depende de asignaciones y un mentor no necesita el catálogo
  // completo: se trae solo lo que su caso va a usar.
  if (rolUsuario === "admin") {
    const todos = await prisma.cliente.findMany();
    return clientesVisibles(rolUsuario, todos, [], alcance);
  }

  const asignados = await prisma.proyectoAsignado.findMany({
    where: { usuarioId },
    include: { cliente: true },
  });
  return clientesVisibles(rolUsuario, [], asignados, alcance);
}

// Memoizada: la piden getProyectosPermitidos y getProyectosConRol, y en una
// pantalla como Time Tracking las dos corren para el mismo usuario.
const rolDe = cache(async function rolDe(usuarioId: string): Promise<string> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true },
  });
  return usuario?.rol ?? "";
});

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
// completa y buscar adentro.
//
// Y memoizada, porque la llaman el layout del proyecto Y la pestaña que se
// esté mostrando, siempre con el mismo id: sin cache() cada pantalla del
// proyecto pagaba dos veces la sesión, el cliente y la asignación.
export const getAccesoProyecto = cache(async function getAccesoProyecto(
  clienteId: string,
): Promise<{ usuario: Usuario; cliente: Cliente } | null> {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") return null;
  const { usuario } = sesion;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return null;

  // La asignación solo se consulta si puede llegar a importar: para un admin
  // la respuesta no depende de ella.
  const estaAsignado =
    usuario.rol === "admin"
      ? false
      : (await prisma.proyectoAsignado.findUnique({
          where: { usuarioId_clienteId: { usuarioId: usuario.id, clienteId } },
          select: { id: true },
        })) !== null;

  return puedeVerProyecto(usuario.rol, estaAsignado) ? { usuario, cliente } : null;
});
