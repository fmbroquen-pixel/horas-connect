"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { Prisma } from "@/generated/prisma/client";

type Resultado = { error?: string };

// El catálogo alimenta el desplegable de Time Tracking, así que un cambio
// invalida también esa pantalla.
function revalidar() {
  revalidatePath("/admin/conceptos");
  revalidatePath("/timetracker");
}

const NombreSchema = z.string().trim().min(1, { error: "El nombre es obligatorio." });

// El nombre es único en la base; sin este chequeo el duplicado revienta la
// action con un error de servidor en vez de un aviso en pantalla. Se compara
// sin distinguir mayúsculas para frenar también "otros"/"Otros".
async function nombreRepetido(nombre: string, exceptoId?: string) {
  const repetido = await prisma.concepto.findFirst({
    where: {
      nombre: { equals: nombre, mode: "insensitive" },
      ...(exceptoId ? { id: { not: exceptoId } } : {}),
    },
    select: { nombre: true },
  });
  return repetido
    ? `Ya existe un concepto con ese nombre ("${repetido.nombre}").`
    : null;
}

export async function crearConcepto(
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  await requireAdmin();
  const parsed = NombreSchema.safeParse(formData.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const repetido = await nombreRepetido(parsed.data);
  if (repetido) return { error: repetido };

  // Entra al final del orden actual.
  const ultimo = await prisma.concepto.findFirst({
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  try {
    await prisma.concepto.create({
      data: { nombre: parsed.data, orden: (ultimo?.orden ?? 0) + 1 },
    });
  } catch (e) {
    // Carrera entre el chequeo y el insert: la restricción única de la base es
    // la última defensa y también tiene que terminar en un aviso.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un concepto con ese nombre." };
    }
    throw e;
  }

  revalidar();
  return {};
}

// Guarda los tres campos de una vez: la fila se edita como una unidad, así
// que un nombre repetido no tiene por qué dejar el orden a medio guardar.
export async function actualizarConcepto(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  await requireAdmin();

  const parsed = NombreSchema.safeParse(formData.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const orden = Number(String(formData.get("orden") ?? "").trim());
  if (!Number.isInteger(orden) || orden < 0) {
    return { error: "El orden debe ser un número entero mayor o igual a 0." };
  }

  // Baja lógica: un concepto inactivo desaparece del desplegable pero sigue
  // etiquetando las horas que ya lo usaron. Por eso no hay borrado real.
  const activo = formData.get("activo") === "activo";

  const repetido = await nombreRepetido(parsed.data, id);
  if (repetido) return { error: repetido };

  try {
    await prisma.concepto.update({
      where: { id },
      data: { nombre: parsed.data, orden, activo },
    });
  } catch (e) {
    // Carrera entre el chequeo y el update: la restricción única de la base es
    // la última defensa y también tiene que terminar en un aviso.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un concepto con ese nombre." };
    }
    throw e;
  }

  revalidar();
  return {};
}
