"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { parseHorasHsMin } from "@/lib/horas";
import {
  diasHabilesEntre,
  fechaDesdeISO,
  finTrasDiasHabiles,
  hoyUTC,
  isoDesdeFecha,
} from "@/lib/dias-habiles";
import { PLANTILLAS, getTareasEnOrden, resecuenciar } from "@/lib/roadmap";
import { ETIQUETA_ESTADO } from "./constantes";
import type { EstadoTareaRoadmap } from "@/generated/prisma/client";

type Resultado = { error?: string };

// Campos que la tabla del Roadmap edita de a uno, en el lugar.
export type CampoTarea =
  | "nombre"
  | "fechaInicio"
  | "fechaFin"
  | "horasEstimadas"
  | "estado"
  | "personas";

// El Roadmap alimenta los KPIs del proyecto y del Home. No toca el
// desplegable de Concepto de Time Tracking: ese catálogo es independiente.
function revalidar() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
}

async function requireAcceso(clienteId: string) {
  const acceso = await getAccesoProyecto(clienteId);
  if (!acceso) throw new Error("No autorizado.");
  return acceso;
}

// Resuelve el proyecto dueño de una lista y valida el acceso de una sola vez.
async function listaConAcceso(listaId: string) {
  const lista = await prisma.listaRoadmap.findUnique({ where: { id: listaId } });
  if (!lista) return null;
  await requireAcceso(lista.clienteId);
  return lista;
}

async function tareaConAcceso(tareaId: string) {
  const tarea = await prisma.tareaRoadmap.findUnique({
    where: { id: tareaId },
    include: { lista: true },
  });
  if (!tarea) return null;
  await requireAcceso(tarea.lista.clienteId);
  return tarea;
}

// La tarea inmediatamente anterior en la secuencia del proyecto. Es el ancla
// del recálculo: todo lo previo mantiene sus fechas y solo se reencadena de
// ahí en adelante. Sin anterior (la tarea es la primera del plan) se devuelve
// undefined y se replanifica desde el arranque del proyecto.
async function anclaPrevia(
  clienteId: string,
  tareaId: string,
): Promise<string | undefined> {
  const tareas = await getTareasEnOrden(clienteId);
  const i = tareas.findIndex((t) => t.id === tareaId);
  return i > 0 ? tareas[i - 1].id : undefined;
}

// Ancla para las operaciones sobre una lista entera: la tarea anterior a la
// primera de esa lista. Así agregar, copiar o borrar una lista no mueve nada
// de lo que venía antes.
async function anclaAntesDeLista(
  clienteId: string,
  listaId: string,
): Promise<string | undefined> {
  const primera = await prisma.tareaRoadmap.findFirst({
    where: { listaId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return primera ? anclaPrevia(clienteId, primera.id) : undefined;
}

// ── Listas ────────────────────────────────────────────────────────────────

const NombreSchema = z.string().trim().min(1, { error: "El nombre es obligatorio." });

export async function crearLista(
  clienteId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const { cliente } = await requireAcceso(clienteId);

  const parsed = NombreSchema.safeParse(formData.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Opcionalmente arranca con las tareas de una plantilla; si no, queda vacía
  // y el usuario la arma a mano.
  const plantillaNombre = String(formData.get("plantilla") ?? "");
  const plantilla = PLANTILLAS.find((p) => p.nombre === plantillaNombre);

  const ultima = await prisma.listaRoadmap.findFirst({
    where: { clienteId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const lista = await prisma.listaRoadmap.create({
    data: {
      clienteId,
      nombre: parsed.data,
      orden: (ultima?.orden ?? -1) + 1,
    },
  });

  if (plantilla) {
    // Fechas provisorias: resecuenciar las reescribe encadenándolas al final
    // del plan. Se necesita un valor porque las columnas no son opcionales.
    const provisoria = cliente.fechaInicio ?? new Date();
    await prisma.tareaRoadmap.createMany({
      data: plantilla.tareas.map((t, i) => ({
        listaId: lista.id,
        nombre: t.nombre,
        orden: i,
        duracionDias: t.duracionDias,
        horasEstimadas: t.horasEstimadas,
        fechaInicio: provisoria,
        fechaFin: provisoria,
      })),
    });
  }

  await resecuenciar(clienteId, await anclaAntesDeLista(clienteId, lista.id));
  revalidar();
  return {};
}

export async function renombrarLista(
  listaId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const lista = await listaConAcceso(listaId);
  if (!lista) return { error: "Lista inexistente." };

  const parsed = NombreSchema.safeParse(formData.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.listaRoadmap.update({
    where: { id: listaId },
    data: { nombre: parsed.data },
  });
  revalidar();
  return {};
}

export async function eliminarLista(listaId: string): Promise<void> {
  const lista = await listaConAcceso(listaId);
  if (!lista) return;

  // El ancla se resuelve antes de borrar, mientras las tareas todavía están
  // en la secuencia.
  const ancla = await anclaAntesDeLista(lista.clienteId, listaId);

  // Las horas cargadas no se tocan: apuntan a una CATEGORÍA, que sobrevive a
  // la lista. El historial sigue clasificado aunque el plan cambie.
  await prisma.listaRoadmap.delete({ where: { id: listaId } });

  await resecuenciar(lista.clienteId, ancla);
  revalidar();
}

// Copia una lista con todas sus tareas al final del plan. Sirve para armar el
// tablero del trimestre siguiente a partir del anterior ya ajustado.
export async function duplicarLista(listaId: string): Promise<void> {
  const lista = await prisma.listaRoadmap.findUnique({
    where: { id: listaId },
    include: { tareas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] } },
  });
  if (!lista) return;
  await requireAcceso(lista.clienteId);

  const ultima = await prisma.listaRoadmap.findFirst({
    where: { clienteId: lista.clienteId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const copia = await prisma.listaRoadmap.create({
    data: {
      clienteId: lista.clienteId,
      nombre: `${lista.nombre} (copia)`,
      orden: (ultima?.orden ?? -1) + 1,
    },
  });

  if (lista.tareas.length > 0) {
    await prisma.tareaRoadmap.createMany({
      data: lista.tareas.map((t, i) => ({
        listaId: copia.id,
        nombre: t.nombre,
        orden: i,
        duracionDias: t.duracionDias,
        horasEstimadas: t.horasEstimadas,
        // El estado no se copia: la lista nueva arranca sin ejecutar.
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
      })),
    });
  }

  await resecuenciar(
    lista.clienteId,
    await anclaAntesDeLista(lista.clienteId, copia.id),
  );
  revalidar();
}

// ── Tareas ────────────────────────────────────────────────────────────────

const TareaSchema = z.object({
  nombre: NombreSchema,
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de inicio inválida." }),
  duracionDias: z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 999, {
      error: "La duración debe ser un número entero de días hábiles (mínimo 1).",
    }),
  horas: z.string().trim(),
  estado: z
    .string()
    .refine((v) => v in ETIQUETA_ESTADO, { error: "Estado inválido." }),
});

function parseTarea(formData: FormData) {
  // El alta no pide fecha: la tarea se agrega al final de su lista y la
  // secuencia le asigna el arranque. Se usa hoy como provisorio para que el
  // esquema valide; resecuenciar lo pisa enseguida.
  const inicio = String(formData.get("fechaInicio") ?? "") || isoDesdeFecha(hoyUTC());

  const parsed = TareaSchema.safeParse({
    nombre: formData.get("nombre"),
    fechaInicio: inicio,
    // El alta tampoco pide duración: la tarea nace de un día hábil y se
    // redimensiona corriendo su fecha de fin en la tabla.
    duracionDias: formData.get("duracionDias") ?? "1",
    horas: formData.get("horasEstimadas") ?? "0",
    estado: formData.get("estado") ?? "sin_iniciar",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Mismo formato que las horas de Time Tracking: acepta 1,5 o 1:30.
  const horas = parseHorasHsMin(parsed.data.horas || "0");
  if (horas === null || horas < 0) {
    return { error: "Horas estimadas inválidas: cargá 1,5 o el formato 1:30." };
  }

  const fechaInicio = fechaDesdeISO(parsed.data.fechaInicio);
  return {
    datos: {
      nombre: parsed.data.nombre,
      fechaInicio,
      fechaFin: finTrasDiasHabiles(fechaInicio, parsed.data.duracionDias),
      duracionDias: parsed.data.duracionDias,
      horasEstimadas: horas,
      estado: parsed.data.estado as EstadoTareaRoadmap,
    },
  };
}

export async function crearTarea(
  listaId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const lista = await listaConAcceso(listaId);
  if (!lista) return { error: "Lista inexistente." };

  const r = parseTarea(formData);
  if (r.error || !r.datos) return { error: r.error };

  const ultima = await prisma.tareaRoadmap.findFirst({
    where: { listaId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const tarea = await prisma.tareaRoadmap.create({
    data: { listaId, orden: (ultima?.orden ?? -1) + 1, ...r.datos },
  });

  // La tarea nueva se suma al final de su lista y arrastra a las siguientes.
  await resecuenciar(lista.clienteId, await anclaPrevia(lista.clienteId, tarea.id));
  revalidar();
  return {};
}

// Guardado de UN campo, disparado por la edición inline de la tabla.
//
// La duración ya no es un campo visible: se deriva del par Inicio/Fin y se
// guarda internamente, que es lo que la secuencia necesita para encadenar.
// De ahí las dos reglas:
//   · mover el Inicio no cambia el tamaño de la tarea → conserva la duración
//     y se recalcula el Fin;
//   · mover el Fin sí la redimensiona → la duración pasa a ser los días
//     hábiles entre Inicio y Fin.
// En los dos casos se reencadena desde esta tarea hacia adelante; lo anterior
// nunca se toca.
export async function actualizarCampoTarea(
  tareaId: string,
  campo: CampoTarea,
  valor: string,
): Promise<Resultado> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return { error: "Tarea inexistente." };

  if (campo === "nombre") {
    const parsed = NombreSchema.safeParse(valor);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    await prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { nombre: parsed.data },
    });
    revalidar();
    return {};
  }

  if (campo === "estado") {
    if (!(valor in ETIQUETA_ESTADO)) return { error: "Estado inválido." };
    await prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { estado: valor as EstadoTareaRoadmap },
    });
    revalidar();
    return {};
  }

  if (campo === "personas") {
    // Solo 1 o 2: es una tarea acompañada o no, no un equipo arbitrario.
    const personas = Number(valor);
    if (personas !== 1 && personas !== 2) {
      return { error: "Las personas involucradas deben ser 1 o 2." };
    }
    await prisma.tareaRoadmap.update({ where: { id: tareaId }, data: { personas } });
    revalidar();
    return {};
  }

  if (campo === "horasEstimadas") {
    const horas = parseHorasHsMin(valor || "0");
    if (horas === null || horas < 0) {
      return { error: "Horas inválidas: cargá 1,5 o el formato 1:30." };
    }
    await prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { horasEstimadas: horas },
    });
    revalidar();
    return {};
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { error: "Fecha inválida." };
  const fecha = fechaDesdeISO(valor);

  let fechaInicio: Date;
  let duracionDias: number;

  if (campo === "fechaInicio") {
    fechaInicio = fecha;
    duracionDias = tarea.duracionDias;
  } else {
    fechaInicio = tarea.fechaInicio;
    if (fecha < fechaInicio) {
      return { error: "El fin no puede ser anterior al inicio." };
    }
    // Mínimo un día hábil: un rango que cae entero en fin de semana
    // igual ocupa una jornada.
    duracionDias = Math.max(1, diasHabilesEntre(fechaInicio, fecha));
  }

  await prisma.tareaRoadmap.update({
    where: { id: tareaId },
    data: {
      fechaInicio,
      duracionDias,
      fechaFin: finTrasDiasHabiles(fechaInicio, duracionDias),
    },
  });

  await resecuenciar(tarea.lista.clienteId, tareaId);
  revalidar();
  return {};
}

// ── Acciones masivas ──────────────────────────────────────────────────────

// Valida el acceso a todos los proyectos tocados y devuelve las tareas.
async function tareasConAcceso(ids: string[]) {
  const tareas = await prisma.tareaRoadmap.findMany({
    where: { id: { in: ids } },
    include: { lista: { select: { clienteId: true } } },
  });
  const clientes = [...new Set(tareas.map((t) => t.lista.clienteId))];
  for (const clienteId of clientes) await requireAcceso(clienteId);
  return { tareas, clientes };
}

// Solo se aplican en masa los campos que tienen sentido uniformes. Las fechas
// y el nombre quedan afuera a propósito: son propios de cada tarea y las
// fechas se derivan de la secuencia.
export async function editarTareas(
  ids: string[],
  campo: "estado" | "horasEstimadas",
  valor: string,
): Promise<{ error?: string; actualizadas?: number }> {
  if (ids.length === 0) return { actualizadas: 0 };
  const { tareas } = await tareasConAcceso(ids);
  if (tareas.length === 0) return { actualizadas: 0 };

  if (campo === "estado") {
    if (!(valor in ETIQUETA_ESTADO)) return { error: "Estado inválido." };
    await prisma.tareaRoadmap.updateMany({
      where: { id: { in: tareas.map((t) => t.id) } },
      data: { estado: valor as EstadoTareaRoadmap },
    });
  } else {
    const horas = parseHorasHsMin(valor || "0");
    if (horas === null || horas < 0) {
      return { error: "Horas inválidas: cargá 1,5 o el formato 1:30." };
    }
    await prisma.tareaRoadmap.updateMany({
      where: { id: { in: tareas.map((t) => t.id) } },
      data: { horasEstimadas: horas },
    });
  }

  // Ninguno de los dos campos toca fechas: no hace falta reencadenar.
  revalidar();
  return { actualizadas: tareas.length };
}

export async function eliminarTareas(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { tareas, clientes } = await tareasConAcceso(ids);
  if (tareas.length === 0) return;

  const idsValidos = tareas.map((t) => t.id);
  const aBorrar = new Set(idsValidos);

  // Las anclas se resuelven ANTES de borrar: es la tarea anterior a la
  // primera eliminada de cada proyecto, y por definición no está en el lote.
  const anclas = new Map<string, string | undefined>();
  for (const clienteId of clientes) {
    const orden = await getTareasEnOrden(clienteId);
    const i = orden.findIndex((t) => aBorrar.has(t.id));
    anclas.set(clienteId, i > 0 ? orden[i - 1].id : undefined);
  }

  await prisma.tareaRoadmap.deleteMany({ where: { id: { in: idsValidos } } });

  for (const clienteId of clientes) {
    await resecuenciar(clienteId, anclas.get(clienteId));
  }
  revalidar();
}

export async function eliminarTarea(tareaId: string): Promise<void> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return;
  const clienteId = tarea.lista.clienteId;

  // El ancla se calcula ANTES de borrar: después, la tarea ya no está en la
  // secuencia y no se podría ubicar su anterior.
  const ancla = await anclaPrevia(clienteId, tareaId);

  // Las horas cargadas no se tocan: apuntan a una categoría, no a esta tarea.
  await prisma.tareaRoadmap.delete({ where: { id: tareaId } });

  await resecuenciar(clienteId, ancla);
  revalidar();
}
