"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function guardarNotaMes(
  anio: number,
  mes: number,
  _prevState: unknown,
  formData: FormData,
): Promise<{ ok?: boolean }> {
  await requireAdmin();
  const texto = String(formData.get("texto") ?? "").trim();

  if (texto === "") {
    await prisma.notaMes.deleteMany({ where: { anio, mes } });
  } else {
    await prisma.notaMes.upsert({
      where: { anio_mes: { anio, mes } },
      update: { texto },
      create: { anio, mes, texto },
    });
  }

  revalidatePath("/rentabilidad");
  return { ok: true };
}
