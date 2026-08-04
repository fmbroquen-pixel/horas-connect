"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { parseHorasHsMin } from "@/lib/horas";
import {
  fechaDesdeISO,
  finTrasDiasHabiles,
  hoyUTC,
  isoDesdeFecha,
} from "@/lib/dias-habiles";
import { PLANTILLAS, getTareasEnOrden, resecuenciar } from "@/lib/roadmap";
import { ETIQUETA_ESTADO } from "./constantes";
import type { EstadoTareaRoadmap } from "@/generated/prisma/client";

type Resultado = { error?: string };

// El Roadmap alimenta el desplegable de Tarea de Time Tracking, así que un
// cambio acá también invalida esa pantalla.
function revalidar() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/timetracker");
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

  // Las horas ya cargadas contra tareas de esta lista no se borran: pierden
  // la referencia y quedan como horas del proyecto sin tarea asignada.
  await prisma.registroHoras.updateMany({
    where: { tarea: { listaId } },
    data: { tareaId: null },
  });
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
    duracionDias: formData.get("duracionDias"),
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

export async function actualizarTarea(
  tareaId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return { error: "Tarea inexistente." };

  const r = parseTarea(formData);
  if (r.error || !r.datos) return { error: r.error };

  await prisma.tareaRoadmap.update({ where: { id: tareaId }, data: r.datos });

  // La tarea editada es el ancla: conserva la fecha que se acaba de fijar y
  // empuja a las posteriores. Las anteriores no se tocan.
  await resecuenciar(tarea.lista.clienteId, tareaId);
  revalidar();
  return {};
}

// Cambio de estado suelto (desde la pastilla de la fila): no toca fechas, así
// que no hace falta recalcular nada.
export async function cambiarEstadoTarea(
  tareaId: string,
  estado: string,
): Promise<Resultado> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return { error: "Tarea inexistente." };
  if (!(estado in ETIQUETA_ESTADO)) return { error: "Estado inválido." };

  await prisma.tareaRoadmap.update({
    where: { id: tareaId },
    data: { estado: estado as EstadoTareaRoadmap },
  });
  revalidar();
  return {};
}

export async function eliminarTarea(tareaId: string): Promise<void> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return;
  const clienteId = tarea.lista.clienteId;

  // El ancla se calcula ANTES de borrar: después, la tarea ya no está en la
  // secuencia y no se podría ubicar su anterior.
  const ancla = await anclaPrevia(clienteId, tareaId);

  await prisma.registroHoras.updateMany({
    where: { tareaId },
    data: { tareaId: null },
  });
  await prisma.tareaRoadmap.delete({ where: { id: tareaId } });

  await resecuenciar(clienteId, ancla);
  revalidar();
}
