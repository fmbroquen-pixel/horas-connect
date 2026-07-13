"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuest } from "@/lib/require-guest";

const VacacionSchema = z.object({
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de inicio inválida." }),
  fechaFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de fin inválida." }),
  dias: z.coerce
    .number()
    .int({ error: "Los días deben ser un número entero." })
    .positive({ error: "Los días deben ser mayores a cero." }),
});

type Resultado = { error?: string };

function validar(formData: FormData) {
  const parsed = VacacionSchema.safeParse({
    fechaInicio: formData.get("fechaInicio"),
    fechaFin: formData.get("fechaFin"),
    dias: formData.get("dias"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const inicio = new Date(parsed.data.fechaInicio + "T00:00:00");
  const fin = new Date(parsed.data.fechaFin + "T00:00:00");
  if (fin < inicio) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." };
  }

  return { datos: { inicio, fin, dias: parsed.data.dias } };
}

export async function crearVacacion(
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const usuario = await requireGuest();

  const r = validar(formData);
  if (r.error || !r.datos) return { error: r.error };

  await prisma.vacacion.create({
    data: {
      usuarioId: usuario.id,
      fechaInicio: r.datos.inicio,
      fechaFin: r.datos.fin,
      dias: r.datos.dias,
    },
  });

  revalidatePath("/vacaciones");
  revalidatePath("/dashboard");
  return {};
}

export async function actualizarVacacion(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const existente = await prisma.vacacion.findUnique({ where: { id } });
  if (!existente) return { error: "Registro no encontrado." };
  if (!esAdmin && existente.usuarioId !== usuario.id) {
    return { error: "No podés modificar vacaciones de otra persona." };
  }

  const r = validar(formData);
  if (r.error || !r.datos) return { error: r.error };

  await prisma.vacacion.update({
    where: { id },
    data: {
      fechaInicio: r.datos.inicio,
      fechaFin: r.datos.fin,
      dias: r.datos.dias,
    },
  });

  revalidatePath("/vacaciones");
  revalidatePath("/dashboard");
  return {};
}

export async function eliminarVacacion(id: string): Promise<void> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const existente = await prisma.vacacion.findUnique({ where: { id } });
  if (!existente) throw new Error("Registro no encontrado.");
  if (!esAdmin && existente.usuarioId !== usuario.id) {
    throw new Error("No podés borrar vacaciones de otra persona.");
  }

  await prisma.vacacion.update({
    where: { id },
    data: { eliminadoEn: new Date() },
  });
  revalidatePath("/vacaciones");
  revalidatePath("/dashboard");
}
