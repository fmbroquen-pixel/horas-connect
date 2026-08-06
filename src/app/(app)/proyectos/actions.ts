"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { ETIQUETA_SEMAFORO } from "./constantes";
import type { SemaforoEstado } from "@/generated/prisma/client";

type Resultado = { error?: string };

// Un solo revalidate cubre el listado, todas las pestañas del detalle y el
// widget "Estado de Proyectos" del Home (misma fuente de datos).
function revalidarProyectos() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
}

async function requireAcceso(clienteId: string) {
  const acceso = await getAccesoProyecto(clienteId);
  if (!acceso) throw new Error("No autorizado.");
  return acceso;
}

// ── Tablero de trabajo ────────────────────────────────────────────────────

const TableroSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/.+/.test(v), {
    error: "El enlace debe empezar con http:// o https://.",
  });

export async function guardarTablero(
  clienteId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  await requireAcceso(clienteId);
  const parsed = TableroSchema.safeParse(formData.get("tableroUrl") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enlace inválido." };
  }

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { tableroUrl: parsed.data || null },
  });
  revalidarProyectos();
  return { error: undefined };
}

// ── Semáforo ──────────────────────────────────────────────────────────────

export async function cambiarSemaforo(
  clienteId: string,
  estado: string,
): Promise<Resultado> {
  const { usuario } = await requireAcceso(clienteId);
  if (!(estado in ETIQUETA_SEMAFORO)) return { error: "Estado inválido." };

  await prisma.semaforoEvento.create({
    data: {
      clienteId,
      estado: estado as SemaforoEstado,
      creadoPorId: usuario.id,
    },
  });
  revalidarProyectos();
  return { error: undefined };
}

// ── Etapa actual ──────────────────────────────────────────────────────────

// Con qué estado puede quedar la etapa que se está dejando atrás. "en_curso"
// no está a propósito: si la anterior lo conservara habría dos etapas
// actuales y el tablero dejaría de describir un plan secuencial.
const CIERRES_ETAPA = ["sin_iniciar", "no_ejecutada", "finalizada"] as const;
export type CierreEtapa = (typeof CIERRES_ETAPA)[number];

// La etapa actual es la última tarea EN CURSO del Roadmap. Elegirla desde la
// card del Home hace dos cosas en un solo movimiento: cierra la que estaba en
// curso con el estado que eligió quien la mueve —terminada, no ejecutada, o
// de vuelta a sin iniciar si arrancó por error— y marca la nueva como en
// curso.
//
// Las dos escrituras van en la misma transacción: a mitad de camino el
// proyecto quedaría con dos etapas en curso o con ninguna, y las dos lecturas
// son estados que la app muestra como si fueran verdad.
export async function marcarEtapaActual(
  clienteId: string,
  tareaId: string,
  cierreAnterior: CierreEtapa,
): Promise<Resultado> {
  await requireAcceso(clienteId);

  // El popup solo ofrece los tres cierres válidos, pero la action es una
  // entrada pública: se valida igual.
  if (!CIERRES_ETAPA.includes(cierreAnterior)) {
    return { error: "La etapa anterior no puede seguir En curso." };
  }

  const tarea = await prisma.tareaRoadmap.findFirst({
    where: { id: tareaId, lista: { clienteId } },
    select: { id: true },
  });
  if (!tarea) return { error: "Esa tarea no pertenece al plan del proyecto." };

  await prisma.$transaction([
    // Barre TODO el proyecto, no solo la lista de la etapa nueva: aunque el
    // plan sea secuencial, un arrastre de datos podría dejar varias en curso
    // en listas distintas y todas describen lo mismo.
    prisma.tareaRoadmap.updateMany({
      where: { lista: { clienteId }, estado: "en_curso", id: { not: tareaId } },
      data: { estado: cierreAnterior },
    }),
    prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { estado: "en_curso" },
    }),
  ]);

  revalidarProyectos();
  return { error: undefined };
}

// Las tareas del proyecto se administran ahora en la pestaña Roadmap
// (roadmap/actions.ts). El Gantt se retiró: sus datos siguen en la tabla
// tareas_proyecto para cuando se rediseñe la vista de cronograma.
