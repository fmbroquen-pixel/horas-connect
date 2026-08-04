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

// Las tareas del proyecto se administran ahora en la pestaña Roadmap
// (roadmap/actions.ts). El Gantt se retiró: sus datos siguen en la tabla
// tareas_proyecto para cuando se rediseñe la vista de cronograma.
