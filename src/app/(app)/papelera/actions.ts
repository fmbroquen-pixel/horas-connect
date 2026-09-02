"use server";

import { revalidatePath } from "next/cache";
import { revalidarHoras } from "@/lib/registros-horas";
import { prisma } from "@/lib/prisma";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import { usuarioBloqueadoDe } from "@/lib/usuario-activo";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto } from "@/lib/formato";
import { RETENCION_DIAS } from "./constantes";

export type TipoEliminado = "hora" | "viatico" | "vacacion" | "roadmap";

// Alcance de la papelera del Follow Up. Los otros tipos son personales —cada
// uno ve lo suyo, el admin ve todo— pero una lista o una tarea no pertenecen
// a nadie: pertenecen a un proyecto. Así que el alcance es por proyecto
// accesible, la misma regla con la que se entra a Follow Up.
async function clientesDelUsuario(usuarioId: string): Promise<string[]> {
  const proyectos = await getProyectosPermitidos(usuarioId);
  return proyectos.map((p) => p.id);
}

export type ItemEliminado = {
  tipo: TipoEliminado;
  seccion: string;
  id: string;
  resumen: string;
  eliminadoEn: string; // ISO
  diasRestantes: number; // hasta el borrado automático
};

function fmt(d: Date) {
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function diasRestantes(eliminadoEn: Date): number {
  const transcurridos = Math.floor(
    (Date.now() - eliminadoEn.getTime()) / 86400000,
  );
  return Math.max(0, RETENCION_DIAS - transcurridos);
}

// Lista los eliminados de un módulo: cada usuario ve los suyos; el admin ve
// todos. Ordenados por fecha de eliminación (más reciente primero).
export async function listarEliminados(
  tipo: TipoEliminado,
): Promise<ItemEliminado[]> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  const scope = esAdmin ? {} : { usuarioId: usuario.id };

  if (tipo === "hora") {
    const horas = await prisma.registroHoras.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      include: { cliente: true },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    });
    return horas.map((h) => ({
      tipo: "hora" as const,
      seccion: "Time Tracking",
      id: h.id,
      resumen: `${fmt(h.fecha)} · ${h.cliente.nombre} · ${formatHorasHsMin(Number(h.horas))} hs`,
      eliminadoEn: h.eliminadoEn!.toISOString(),
      diasRestantes: diasRestantes(h.eliminadoEn!),
    }));
  }

  if (tipo === "viatico") {
    const viaticos = await prisma.viatico.findMany({
      where: { eliminadoEn: { not: null }, ...scope },
      include: { cliente: true },
      orderBy: { eliminadoEn: "desc" },
      take: 100,
    });
    return viaticos.map((v) => ({
      tipo: "viatico" as const,
      seccion: "Expenses",
      id: v.id,
      resumen: `${fmt(v.fecha)} · ${v.cliente.nombre} · ${v.moneda} ${formatMonto(Number(v.monto))}`,
      eliminadoEn: v.eliminadoEn!.toISOString(),
      diasRestantes: diasRestantes(v.eliminadoEn!),
    }));
  }

  if (tipo === "roadmap") {
    const clienteIds = await clientesDelUsuario(usuario.id);
    if (clienteIds.length === 0) return [];

    // Listas y tareas se listan juntas: para quien borró algo, "la papelera
    // de Follow Up" es una sola, y la sección de cada ítem ya dice cuál es
    // cuál.
    const [listas, tareas] = await Promise.all([
      prisma.listaRoadmap.findMany({
        where: { eliminadoEn: { not: null }, clienteId: { in: clienteIds } },
        include: { cliente: { select: { nombre: true } }, _count: { select: { tareas: true } } },
        orderBy: { eliminadoEn: "desc" },
        take: 100,
      }),
      prisma.tareaRoadmap.findMany({
        where: {
          eliminadoEn: { not: null },
          lista: { clienteId: { in: clienteIds } },
        },
        include: {
          lista: { select: { nombre: true, cliente: { select: { nombre: true } } } },
        },
        orderBy: { eliminadoEn: "desc" },
        take: 100,
      }),
    ]);

    const items: ItemEliminado[] = [
      ...listas.map((l) => ({
        tipo: "roadmap" as const,
        seccion: "Follow Up · Lista",
        id: `lista:${l.id}`,
        resumen: `${l.cliente.nombre} · ${l.nombre} (${l._count.tareas} tareas)`,
        eliminadoEn: l.eliminadoEn!.toISOString(),
        diasRestantes: diasRestantes(l.eliminadoEn!),
      })),
      ...tareas.map((t) => ({
        tipo: "roadmap" as const,
        seccion: "Follow Up · Tarea",
        id: `tarea:${t.id}`,
        resumen: `${t.lista.cliente.nombre} · ${t.lista.nombre} · ${t.nombre}`,
        eliminadoEn: t.eliminadoEn!.toISOString(),
        diasRestantes: diasRestantes(t.eliminadoEn!),
      })),
    ];
    return items.sort((a, b) => b.eliminadoEn.localeCompare(a.eliminadoEn));
  }

  const vacaciones = await prisma.vacacion.findMany({
    where: { eliminadoEn: { not: null }, ...scope },
    orderBy: { eliminadoEn: "desc" },
    take: 100,
  });
  return vacaciones.map((v) => ({
    tipo: "vacacion" as const,
    seccion: "Time Off",
    id: v.id,
    resumen: `${fmt(v.fechaInicio)}–${fmt(v.fechaFin)} · ${v.dias} días`,
    eliminadoEn: v.eliminadoEn!.toISOString(),
    diasRestantes: diasRestantes(v.eliminadoEn!),
  }));
}

// El id de un ítem del Roadmap viaja prefijado ("lista:…" / "tarea:…")
// porque la papelera del Follow Up mezcla los dos tipos en una sola lista.
function parseRoadmapId(id: string): { clase: "lista" | "tarea"; id: string } | null {
  const [clase, real] = id.split(":", 2);
  if ((clase !== "lista" && clase !== "tarea") || !real) return null;
  return { clase, id: real };
}

// Alcance de escritura del Roadmap: solo sobre proyectos a los que el usuario
// tiene acceso. Se valida acá y no solo en la UI.
async function scopeRoadmap(usuarioId: string) {
  const clienteIds = await clientesDelUsuario(usuarioId);
  return { clienteIds };
}

function revalidarRoadmap() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
}

export async function restaurarItem(
  tipo: TipoEliminado,
  id: string,
): Promise<void> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  const scope = esAdmin ? {} : { usuarioId: usuario.id };
  const data = { eliminadoEn: null };

  if (tipo === "roadmap") {
    const ref = parseRoadmapId(id);
    if (!ref) return;
    const { clienteIds } = await scopeRoadmap(usuario.id);
    // Restaurar limpia la marca y nada más: los datos y el orden nunca se
    // tocaron, así que el ítem vuelve exactamente donde estaba. Las fechas de
    // lo que sigue se recalculan solas en la próxima secuencia.
    const limpiar = { eliminadoEn: null, eliminadoPorId: null };
    if (ref.clase === "lista") {
      await prisma.listaRoadmap.updateMany({
        where: { id: ref.id, clienteId: { in: clienteIds } },
        data: limpiar,
      });
    } else {
      await prisma.tareaRoadmap.updateMany({
        where: { id: ref.id, lista: { clienteId: { in: clienteIds } } },
        data: limpiar,
      });
    }
    revalidarRoadmap();
    return;
  }

  if (tipo === "hora") {
    // Restaurar es devolver el registro a la tabla viva: es un cambio de estado
    // sobre un dato de alguien, no una lectura. Si ese alguien está bloqueado,
    // su historia se mira y se queda donde está.
    const fila = await prisma.registroHoras.findUnique({
      where: { id },
      select: { usuarioId: true },
    });
    if (fila && (await usuarioBloqueadoDe([fila.usuarioId]))) return;
    await prisma.registroHoras.updateMany({ where: { id, ...scope }, data });
    revalidarHoras();
  } else if (tipo === "viatico") {
    const fila = await prisma.viatico.findUnique({
      where: { id },
      select: { usuarioId: true },
    });
    if (fila && (await usuarioBloqueadoDe([fila.usuarioId]))) return;
    await prisma.viatico.updateMany({ where: { id, ...scope }, data });
    revalidatePath("/viaticos");
    revalidatePath("/proyectos", "layout");
  } else {
    await prisma.vacacion.updateMany({ where: { id, ...scope }, data });
    revalidatePath("/vacaciones");
    revalidatePath("/dashboard");
  }
}

// Borrado definitivo desde la papelera: esto no se puede deshacer.
//
// Existe porque una lista o una tarea mandadas a la papelera siguen ocupando
// lugar en la papelera durante RETENCION_DIAS, y a veces se borra algo que ya
// se sabe que no vuelve. Para el resto de los módulos el borrado definitivo
// lo hace el cron al vencer el plazo.
export async function eliminarDefinitivo(
  tipo: TipoEliminado,
  id: string,
): Promise<void> {
  const usuario = await requireGuest();
  if (tipo !== "roadmap") return;

  const ref = parseRoadmapId(id);
  if (!ref) return;
  const { clienteIds } = await scopeRoadmap(usuario.id);

  if (ref.clase === "lista") {
    // La cascada del schema se lleva sus tareas.
    await prisma.listaRoadmap.deleteMany({
      where: { id: ref.id, clienteId: { in: clienteIds }, eliminadoEn: { not: null } },
    });
  } else {
    await prisma.tareaRoadmap.deleteMany({
      where: {
        id: ref.id,
        lista: { clienteId: { in: clienteIds } },
        eliminadoEn: { not: null },
      },
    });
  }
  revalidarRoadmap();
}
