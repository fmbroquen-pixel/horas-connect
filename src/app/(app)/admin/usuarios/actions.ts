"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { MAX_BACKUPS } from "./constantes";
import { Prisma } from "@/generated/prisma/client";
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

export type ResultadoAsignacion = { error?: string; ok?: boolean };

// Guarda los proyectos del usuario con su rol. Reglas, todas revalidadas acá
// aunque la UI ya las bloquee: un único owner por proyecto, hasta dos backups,
// y nadie puede ser owner y backup del mismo proyecto.
//
// Solo toca las filas CON rol: las asignaciones viejas sin rol declarado se
// dejan intactas para no quitarle a nadie el permiso de cargar horas por
// haber guardado este formulario. Se completan marcando el proyecto en una de
// las dos solapas.
export async function guardarProyectosAsignados(
  usuarioId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ResultadoAsignacion> {
  // La asignación de clientes la centraliza el admin: ningún usuario (ni
  // siquiera sobre sí mismo) puede cambiar sus propios clientes asignados.
  await requireAdmin();

  const owners = [...new Set(formData.getAll("owner").map(String))];
  const backups = [...new Set(formData.getAll("backup").map(String))];

  const enAmbos = owners.filter((id) => backups.includes(id));
  if (enAmbos.length > 0) {
    return {
      error: "Un mismo usuario no puede ser Owner y Backup del mismo proyecto.",
    };
  }

  const clienteIds = [...owners, ...backups];
  if (clienteIds.length > 0) {
    const existen = await prisma.cliente.count({ where: { id: { in: clienteIds } } });
    if (existen !== clienteIds.length) return { error: "Proyecto inexistente." };
  }

  // Estado actual de los proyectos tocados, sin contar a este usuario: es
  // contra esto que se validan los cupos.
  const ajenas = await prisma.proyectoAsignado.findMany({
    where: {
      clienteId: { in: clienteIds },
      usuarioId: { not: usuarioId },
      rol: { not: null },
    },
    include: { cliente: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
  });

  for (const clienteId of owners) {
    const ocupado = ajenas.find((a) => a.clienteId === clienteId && a.rol === "owner");
    if (ocupado) {
      return {
        error: `"${ocupado.cliente.nombre}" ya tiene a ${ocupado.usuario.nombre} como Mentor Owner. Sacáselo antes de reasignarlo.`,
      };
    }
  }

  for (const clienteId of backups) {
    const otros = ajenas.filter((a) => a.clienteId === clienteId && a.rol === "backup");
    if (otros.length >= MAX_BACKUPS) {
      return {
        error: `"${otros[0].cliente.nombre}" ya tiene ${MAX_BACKUPS} Mentores Backup (${otros
          .map((o) => o.usuario.nombre)
          .join(", ")}).`,
      };
    }
  }

  // Las validaciones de arriba son la vía amable: nombran al ocupante y al
  // proyecto. Pero corren antes de la transacción, así que dos admins
  // guardando a la vez podrían pasarlas los dos. El cierre real es por abajo:
  //
  //   · un solo owner por proyecto lo garantiza un índice único parcial en la
  //     base (proyectos_asignados_owner_unico_por_cliente), y acá se traduce
  //     el P2002 a un mensaje legible en vez de dejar salir un 500 crudo;
  //   · el cupo de backups no se puede expresar como índice, así que se
  //     vuelve a contar DENTRO de la transacción, ya con las filas viejas
  //     borradas y viendo lo que haya escrito el otro admin.
  const CUPO_SUPERADO = "CUPO_BACKUPS";
  try {
    await prisma.$transaction(async (tx) => {
      // Se borran solo las asignaciones CON rol de este usuario; las que no
      // tienen rol sobreviven y conservan su permiso de carga.
      await tx.proyectoAsignado.deleteMany({
        where: { usuarioId, rol: { not: null } },
      });

      for (const clienteId of backups) {
        const ocupados = await tx.proyectoAsignado.count({
          where: { clienteId, rol: "backup", usuarioId: { not: usuarioId } },
        });
        if (ocupados >= MAX_BACKUPS) throw new Error(CUPO_SUPERADO);
      }

      for (const [rol, ids] of [
        ["owner", owners],
        ["backup", backups],
      ] as const) {
        for (const clienteId of ids) {
          // upsert y no create: el usuario puede tener ya una fila sin rol para
          // ese proyecto, y hay una sola fila por (usuario, cliente).
          await tx.proyectoAsignado.upsert({
            where: { usuarioId_clienteId: { usuarioId, clienteId } },
            create: { usuarioId, clienteId, rol },
            update: { rol },
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === CUPO_SUPERADO) {
      return {
        error: `Alguno de los proyectos ya tiene ${MAX_BACKUPS} Mentores Backup. Actualizá la pantalla y volvé a intentar.`,
      };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        error:
          "Alguno de los proyectos ya tiene un Mentor Owner. Actualizá la pantalla y volvé a intentar.",
      };
    }
    throw e;
  }

  revalidatePath(`/admin/usuarios/${usuarioId}`);
  revalidatePath("/mi-perfil");
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
  return { ok: true };
}
