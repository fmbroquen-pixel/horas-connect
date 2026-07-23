"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { ETIQUETA_SEMAFORO, ETIQUETA_ESTADO_TAREA } from "./constantes";
import type { SemaforoEstado, EstadoTarea } from "@/generated/prisma/client";

type Resultado = { error?: string };

// Un solo revalidate cubre el listado, todas las pestañas del detalle y el
// tablero "Estado de Proyectos" de Analytics (misma fuente de datos).
function revalidarProyectos() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/rentabilidad", "layout");
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

export async function cambiarEtapa(
  clienteId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const { usuario } = await requireAcceso(clienteId);
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return { error: "Elegí una etapa." };

  const etapa = await prisma.etapa.findFirst({
    where: { id: etapaId, activo: true },
  });
  if (!etapa) return { error: "Etapa inexistente." };

  await prisma.etapaEvento.create({
    data: { clienteId, etapaId, creadoPorId: usuario.id },
  });
  revalidarProyectos();
  return { error: undefined };
}

// ── Tareas del Gantt ──────────────────────────────────────────────────────

const TareaSchema = z.object({
  titulo: z.string().trim().min(1, { error: "El título es obligatorio." }),
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de inicio inválida." }),
  fechaFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de fin inválida." }),
  estado: z
    .string()
    .refine((v) => v in ETIQUETA_ESTADO_TAREA, { error: "Estado inválido." }),
  responsable: z.string().trim(),
});

function parseTarea(formData: FormData) {
  const parsed = TareaSchema.safeParse({
    titulo: formData.get("titulo"),
    fechaInicio: formData.get("fechaInicio"),
    fechaFin: formData.get("fechaFin"),
    estado: formData.get("estado"),
    responsable: formData.get("responsable") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (parsed.data.fechaFin < parsed.data.fechaInicio) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." };
  }
  return {
    datos: {
      titulo: parsed.data.titulo,
      fechaInicio: new Date(parsed.data.fechaInicio + "T00:00:00Z"),
      fechaFin: new Date(parsed.data.fechaFin + "T00:00:00Z"),
      estado: parsed.data.estado as EstadoTarea,
      responsable: parsed.data.responsable || null,
    },
  };
}

export async function crearTarea(
  clienteId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  await requireAcceso(clienteId);
  const r = parseTarea(formData);
  if (r.error || !r.datos) return { error: r.error };

  await prisma.tareaProyecto.create({ data: { clienteId, ...r.datos } });
  revalidarProyectos();
  return { error: undefined };
}

export async function actualizarTarea(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const tarea = await prisma.tareaProyecto.findUnique({ where: { id } });
  if (!tarea) return { error: "Tarea inexistente." };
  await requireAcceso(tarea.clienteId);

  const r = parseTarea(formData);
  if (r.error || !r.datos) return { error: r.error };

  await prisma.tareaProyecto.update({ where: { id }, data: r.datos });
  revalidarProyectos();
  return { error: undefined };
}

export async function eliminarTarea(id: string): Promise<void> {
  const tarea = await prisma.tareaProyecto.findUnique({ where: { id } });
  if (!tarea) return;
  await requireAcceso(tarea.clienteId);

  await prisma.tareaProyecto.delete({ where: { id } });
  revalidarProyectos();
}
