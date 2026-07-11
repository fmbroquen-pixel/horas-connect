"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { Modalidad, RolSesion } from "@/generated/prisma/client";

const MentorSchema = z.object({
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
});

export async function crearMentor(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = MentorSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const mentor = await prisma.mentor.create({ data: parsed.data });
  await asegurarTarifaCero(mentor.id);
  revalidatePath("/admin/mentores");
  return { error: undefined };
}

export async function actualizarMentor(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = MentorSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
  });
  if (!parsed.success) return;

  await prisma.mentor.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/mentores");
  revalidatePath(`/admin/mentores/${id}`);
}

export async function alternarActivoMentor(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.mentor.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/mentores");
}

const COMBOS_FACTURABLES: { modalidad: Modalidad; rol: RolSesion }[] = [
  { modalidad: "presencial", rol: "titular" },
  { modalidad: "presencial", rol: "acompanante" },
  { modalidad: "virtual", rol: "titular" },
  { modalidad: "virtual", rol: "acompanante" },
];

const TarifaFijaSchema = z.object({
  tipoTarifa: z.literal("fija"),
  valorUsd: z.coerce.number().min(0, { error: "El valor no puede ser negativo." }),
});

const TarifaVariableSchema = z.object({
  tipoTarifa: z.literal("variable"),
  presencialTitular: z.coerce.number().min(0),
  presencialAcompanante: z.coerce.number().min(0),
  virtualTitular: z.coerce.number().min(0),
  virtualAcompanante: z.coerce.number().min(0),
});

export async function guardarTarifa(
  mentorId: string,
  _prevState: unknown,
  formData: FormData,
) {
  await requireAdmin();

  const tipoTarifa = formData.get("tipoTarifa");

  if (tipoTarifa === "fija") {
    const parsed = TarifaFijaSchema.safeParse({
      tipoTarifa,
      valorUsd: formData.get("valorUsd"),
    });
    if (!parsed.success) return { error: "Valor inválido." };

    await prisma.mentor.update({
      where: { id: mentorId },
      data: { tipoTarifa: "fija" },
    });
    for (const combo of COMBOS_FACTURABLES) {
      await upsertTarifaVigente(
        mentorId,
        combo.modalidad,
        combo.rol,
        parsed.data.valorUsd,
      );
    }
  } else if (tipoTarifa === "variable") {
    const parsed = TarifaVariableSchema.safeParse({
      tipoTarifa,
      presencialTitular: formData.get("presencialTitular"),
      presencialAcompanante: formData.get("presencialAcompanante"),
      virtualTitular: formData.get("virtualTitular"),
      virtualAcompanante: formData.get("virtualAcompanante"),
    });
    if (!parsed.success) return { error: "Alguno de los valores es inválido." };

    await prisma.mentor.update({
      where: { id: mentorId },
      data: { tipoTarifa: "variable" },
    });
    await upsertTarifaVigente(
      mentorId,
      "presencial",
      "titular",
      parsed.data.presencialTitular,
    );
    await upsertTarifaVigente(
      mentorId,
      "presencial",
      "acompanante",
      parsed.data.presencialAcompanante,
    );
    await upsertTarifaVigente(
      mentorId,
      "virtual",
      "titular",
      parsed.data.virtualTitular,
    );
    await upsertTarifaVigente(
      mentorId,
      "virtual",
      "acompanante",
      parsed.data.virtualAcompanante,
    );
  } else {
    return { error: "Elegí un tipo de tarifa." };
  }

  await asegurarTarifaCero(mentorId);
  revalidatePath(`/admin/mentores/${mentorId}`);
  revalidatePath("/admin/mentores");
  return { error: undefined };
}

// Cierra la tarifa vigente para esa combinación (si el valor cambió) y crea
// una nueva. Si el valor es igual al vigente, no toca nada (evita ensuciar
// el historial con filas idénticas).
async function upsertTarifaVigente(
  mentorId: string,
  modalidad: Modalidad,
  rol: RolSesion,
  valorUsd: number,
) {
  const vigente = await prisma.tarifa.findFirst({
    where: { mentorId, modalidad, rol, vigenteHasta: null },
  });

  if (vigente && Number(vigente.valorUsd) === valorUsd) return;

  const ahora = new Date();
  if (vigente) {
    await prisma.tarifa.update({
      where: { id: vigente.id },
      data: { vigenteHasta: ahora },
    });
  }
  await prisma.tarifa.create({
    data: { mentorId, modalidad, rol, valorUsd, vigenteDesde: ahora },
  });
}

async function asegurarTarifaCero(mentorId: string) {
  const existente = await prisma.tarifa.findFirst({
    where: {
      mentorId,
      modalidad: "valor_cero",
      rol: "valor_cero",
      vigenteHasta: null,
    },
  });
  if (!existente) {
    await prisma.tarifa.create({
      data: {
        mentorId,
        modalidad: "valor_cero",
        rol: "valor_cero",
        valorUsd: 0,
      },
    });
  }
}
