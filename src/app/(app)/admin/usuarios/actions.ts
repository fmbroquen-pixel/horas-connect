"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { Modalidad, Ownership } from "@/generated/prisma/client";

const UsuarioSchema = z.object({
  email: z.email({ error: "Email inválido." }).trim().toLowerCase(),
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  rol: z.enum(["admin", "guest", "reader"], { error: "Elegí un rol." }),
});

export async function crearUsuario(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = UsuarioSchema.safeParse({
    email: formData.get("email"),
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.usuario.create({ data: parsed.data });
  revalidatePath("/admin/usuarios");
  return { error: undefined };
}

export async function actualizarUsuario(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = UsuarioSchema.safeParse({
    email: formData.get("email"),
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
  });
  if (!parsed.success) return;

  if (parsed.data.rol !== "admin") {
    await bloquearSiEsUltimoAdmin(id, admin.id);
  }

  await prisma.usuario.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
}

export async function alternarActivoUsuario(id: string, activo: boolean) {
  const admin = await requireAdmin();
  if (!activo) {
    await bloquearSiEsUltimoAdmin(id, admin.id);
  }
  await prisma.usuario.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/usuarios");
}

// Evita que se desactive o degrade al ultimo administrador activo, lo que
// dejaria la app sin nadie que pueda volver a habilitar usuarios.
async function bloquearSiEsUltimoAdmin(usuarioId: string, adminActualId: string) {
  const objetivo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!objetivo || objetivo.rol !== "admin" || !objetivo.activo) return;

  const otrosAdmins = await prisma.usuario.count({
    where: { rol: "admin", activo: true, id: { not: usuarioId } },
  });
  if (otrosAdmins === 0) {
    throw new Error(
      usuarioId === adminActualId
        ? "No podés quitarte el rol de administrador siendo el único activo."
        : "No se puede desactivar al único administrador activo.",
    );
  }
}

const COMBOS_FACTURABLES: { modalidad: Modalidad; ownership: Ownership }[] = [
  { modalidad: "presencial", ownership: "owner" },
  { modalidad: "presencial", ownership: "backup" },
  { modalidad: "virtual", ownership: "owner" },
  { modalidad: "virtual", ownership: "backup" },
];

const TarifaFijaSchema = z.object({
  tipoTarifa: z.literal("fija"),
  valorUsd: z.coerce.number().min(0, { error: "El valor no puede ser negativo." }),
});

const TarifaVariableSchema = z.object({
  tipoTarifa: z.literal("variable"),
  presencialOwner: z.coerce.number().min(0),
  presencialBackup: z.coerce.number().min(0),
  virtualOwner: z.coerce.number().min(0),
  virtualBackup: z.coerce.number().min(0),
});

export async function guardarTarifa(
  usuarioId: string,
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

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { tipoTarifa: "fija" },
    });
    for (const combo of COMBOS_FACTURABLES) {
      await upsertTarifaVigente(
        usuarioId,
        combo.modalidad,
        combo.ownership,
        parsed.data.valorUsd,
      );
    }
  } else if (tipoTarifa === "variable") {
    const parsed = TarifaVariableSchema.safeParse({
      tipoTarifa,
      presencialOwner: formData.get("presencialOwner"),
      presencialBackup: formData.get("presencialBackup"),
      virtualOwner: formData.get("virtualOwner"),
      virtualBackup: formData.get("virtualBackup"),
    });
    if (!parsed.success) return { error: "Alguno de los valores es inválido." };

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { tipoTarifa: "variable" },
    });
    await upsertTarifaVigente(
      usuarioId,
      "presencial",
      "owner",
      parsed.data.presencialOwner,
    );
    await upsertTarifaVigente(
      usuarioId,
      "presencial",
      "backup",
      parsed.data.presencialBackup,
    );
    await upsertTarifaVigente(
      usuarioId,
      "virtual",
      "owner",
      parsed.data.virtualOwner,
    );
    await upsertTarifaVigente(
      usuarioId,
      "virtual",
      "backup",
      parsed.data.virtualBackup,
    );
  } else {
    return { error: "Elegí un tipo de tarifa." };
  }

  await asegurarTarifaCero(usuarioId);
  revalidatePath(`/admin/usuarios/${usuarioId}`);
  revalidatePath("/admin/usuarios");
  return { error: undefined };
}

// Cierra la tarifa vigente para esa combinación (si el valor cambió) y crea
// una nueva. Si el valor es igual al vigente, no toca nada (evita ensuciar
// el historial con filas idénticas).
async function upsertTarifaVigente(
  usuarioId: string,
  modalidad: Modalidad,
  ownership: Ownership,
  valorUsd: number,
) {
  const vigente = await prisma.tarifa.findFirst({
    where: { usuarioId, modalidad, ownership, vigenteHasta: null },
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
    data: { usuarioId, modalidad, ownership, valorUsd, vigenteDesde: ahora },
  });
}

async function asegurarTarifaCero(usuarioId: string) {
  const existente = await prisma.tarifa.findFirst({
    where: {
      usuarioId,
      modalidad: "valor_cero",
      ownership: "valor_cero",
      vigenteHasta: null,
    },
  });
  if (!existente) {
    await prisma.tarifa.create({
      data: {
        usuarioId,
        modalidad: "valor_cero",
        ownership: "valor_cero",
        valorUsd: 0,
      },
    });
  }
}

export async function guardarProyectosAsignados(
  usuarioId: string,
  formData: FormData,
) {
  await requireAdmin();
  const clienteIds = formData.getAll("clienteId").map(String);

  await prisma.$transaction([
    prisma.proyectoAsignado.deleteMany({ where: { usuarioId } }),
    prisma.proyectoAsignado.createMany({
      data: clienteIds.map((clienteId) => ({ usuarioId, clienteId })),
    }),
  ]);

  revalidatePath(`/admin/usuarios/${usuarioId}`);
}
