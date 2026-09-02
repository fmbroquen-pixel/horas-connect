"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteInactivoDe, mensajeInactivo } from "@/lib/cliente-activo";
import type { ResultadoEstado } from "@/components/boton-estado";
import { diaUtc, reconstruirVigencias } from "@/lib/vigencias";
import { fechaDesdeISO } from "@/lib/dias-habiles";
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
    // Acá sigue siendo un throw: este formulario no tiene por dónde mostrar un
    // mensaje, y degradar al último admin dejaría la app sin nadie que pueda
    // volver a habilitar usuarios. Frenar feo es mejor que no frenar.
    const impedimento = await motivoParaNoDesactivar(id, admin.id);
    if (impedimento) throw new Error(impedimento);
  }

  await prisma.usuario.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
}

// Devuelve un resultado en vez de tirar: desactivar al ultimo admin es un caso
// esperable, y hasta ahora se manifestaba como un error sin manejar en vez de
// como una explicacion.
export async function alternarActivoUsuario(
  id: string,
  activo: boolean,
): Promise<ResultadoEstado> {
  const admin = await requireAdmin();
  if (!activo) {
    const impedimento = await motivoParaNoDesactivar(id, admin.id);
    if (impedimento) return { error: impedimento };
  }
  await prisma.usuario.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: true };
}

// Evita que se desactive o degrade al ultimo administrador activo, lo que
// dejaria la app sin nadie que pueda volver a habilitar usuarios.
async function motivoParaNoDesactivar(
  usuarioId: string,
  adminActualId: string,
): Promise<string | null> {
  const objetivo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!objetivo || objetivo.rol !== "admin" || !objetivo.activo) return null;

  const otrosAdmins = await prisma.usuario.count({
    where: { rol: "admin", activo: true, id: { not: usuarioId } },
  });
  if (otrosAdmins > 0) return null;
  return usuarioId === adminActualId
    ? "No podés quitarte el rol de administrador siendo el único activo."
    : "No se puede desactivar al único administrador activo.";
}

const COMBOS_FACTURABLES: { modalidad: Modalidad; ownership: Ownership }[] = [
  { modalidad: "presencial", ownership: "owner" },
  { modalidad: "presencial", ownership: "backup" },
  { modalidad: "virtual", ownership: "owner" },
  { modalidad: "virtual", ownership: "backup" },
];

// Desde cuándo rige lo que se está guardando. Es una fecha de calendario, no
// un instante: se interpreta en UTC como el resto del sistema.
const VigenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de vigencia inválida." });

const TarifaFijaSchema = z.object({
  tipoTarifa: z.literal("fija"),
  valorUsd: z.coerce.number().min(0, { error: "El valor no puede ser negativo." }),
  vigenteDesde: VigenciaSchema,
});

const TarifaVariableSchema = z.object({
  tipoTarifa: z.literal("variable"),
  presencialOwner: z.coerce.number().min(0),
  presencialBackup: z.coerce.number().min(0),
  virtualOwner: z.coerce.number().min(0),
  virtualBackup: z.coerce.number().min(0),
  vigenteDesde: VigenciaSchema,
});

export async function guardarTarifa(
  usuarioId: string,
  _prevState: unknown,
  formData: FormData,
) {
  const admin = await requireAdmin();

  const tipoTarifa = formData.get("tipoTarifa");

  if (tipoTarifa === "fija") {
    const parsed = TarifaFijaSchema.safeParse({
      tipoTarifa,
      valorUsd: formData.get("valorUsd"),
      vigenteDesde: formData.get("vigenteDesde"),
    });
    if (!parsed.success) return { error: "Valor o fecha de vigencia inválidos." };
    const desde = fechaDesdeISO(parsed.data.vigenteDesde);

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
        desde,
        admin.id,
      );
    }
  } else if (tipoTarifa === "variable") {
    const parsed = TarifaVariableSchema.safeParse({
      tipoTarifa,
      presencialOwner: formData.get("presencialOwner"),
      presencialBackup: formData.get("presencialBackup"),
      virtualOwner: formData.get("virtualOwner"),
      virtualBackup: formData.get("virtualBackup"),
      vigenteDesde: formData.get("vigenteDesde"),
    });
    if (!parsed.success) {
      return { error: "Alguno de los valores o la fecha de vigencia es inválido." };
    }
    const desde = fechaDesdeISO(parsed.data.vigenteDesde);

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { tipoTarifa: "variable" },
    });
    await upsertTarifaVigente(
      usuarioId,
      "presencial",
      "owner",
      parsed.data.presencialOwner,
      desde,
      admin.id,
    );
    await upsertTarifaVigente(
      usuarioId,
      "presencial",
      "backup",
      parsed.data.presencialBackup,
      desde,
      admin.id,
    );
    await upsertTarifaVigente(
      usuarioId,
      "virtual",
      "owner",
      parsed.data.virtualOwner,
      desde,
      admin.id,
    );
    await upsertTarifaVigente(
      usuarioId,
      "virtual",
      "backup",
      parsed.data.virtualBackup,
      desde,
      admin.id,
    );
  } else {
    return { error: "Elegí un tipo de tarifa." };
  }

  await asegurarTarifaCero(usuarioId);
  revalidatePath(`/admin/usuarios/${usuarioId}`);
  revalidatePath("/admin/usuarios");
  return { error: undefined };
}

// Declara que a partir de `vigenteDesde` esa combinación vale `valorUsd`.
//
// Antes esto cerraba la vigente con `new Date()` y abría la nueva con el mismo
// instante, o sea que la vigencia era "desde que apreté Guardar". Eso alcanzaba
// mientras nadie mirara para atrás, pero al calcular el monto con la tarifa de
// la fecha del registro pasó a importar: cargar horas de julio y recién en
// agosto configurar la tarifa dejaba esas horas del lado equivocado del corte.
// Ahora la fecha se declara.
//
// El cierre de cada tramo no se escribe acá: se deriva de la fecha del tramo
// siguiente, en reordenarHistorial.
async function upsertTarifaVigente(
  usuarioId: string,
  modalidad: Modalidad,
  ownership: Ownership,
  valorUsd: number,
  vigenteDesde: Date,
  // Quién la está declarando. Va al historial: una tarifa es plata, y saber
  // quién la puso importa tanto como el número.
  creadoPorId: string,
) {
  const desde = diaUtc(vigenteDesde);

  // Un valor por combinación y día. Si ya se había declarado algo para ese
  // día, se corrige en lugar de apilar otra fila —que además chocaría contra
  // el unique de (usuario, modalidad, ownership, vigenteDesde)—.
  const mismoDia = await prisma.tarifa.findFirst({
    where: { usuarioId, modalidad, ownership, vigenteDesde: desde },
    select: { id: true },
  });

  if (mismoDia) {
    await prisma.tarifa.update({
      where: { id: mismoDia.id },
      data: { valorUsd, creadoPorId },
    });
  } else {
    await prisma.tarifa.create({
      data: {
        usuarioId,
        modalidad,
        ownership,
        valorUsd,
        vigenteDesde: desde,
        creadoPorId,
      },
    });
  }

  await reordenarHistorial(usuarioId, modalidad, ownership);
}

// Deja el historial de una combinación consistente después de escribirlo: sin
// huecos, sin solapamientos y sin las filas que no llegaron a regir. La regla
// está en lib/vigencias; acá solo se lee, se aplica y se guarda.
async function reordenarHistorial(
  usuarioId: string,
  modalidad: Modalidad,
  ownership: Ownership,
) {
  const filas = await prisma.tarifa.findMany({
    where: { usuarioId, modalidad, ownership },
    select: { id: true, valorUsd: true, vigenteDesde: true, createdAt: true },
  });

  const plan = reconstruirVigencias(
    filas.map((f) => ({
      id: f.id,
      valorUsd: Number(f.valorUsd),
      // Normalizadas a día: las filas viejas se guardaron con la hora del
      // clic, y sin esto dos cambios del mismo día no se reconocen como el
      // mismo punto de la línea de tiempo.
      vigenteDesde: diaUtc(f.vigenteDesde),
      createdAt: f.createdAt,
    })),
  );

  await prisma.$transaction([
    // Los borrados van primero: liberan el unique por (combinación, fecha)
    // antes de que las que quedan se muevan a su día normalizado.
    ...(plan.eliminar.length > 0
      ? [prisma.tarifa.deleteMany({ where: { id: { in: plan.eliminar } } })]
      : []),
    ...plan.actualizar.map((a) =>
      prisma.tarifa.update({
        where: { id: a.id },
        data: { vigenteDesde: a.vigenteDesde, vigenteHasta: a.vigenteHasta },
      }),
    ),
  ]);
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
// aunque la UI ya las bloquee: un único owner por proyecto, un tope de
// backups (MAX_BACKUPS),
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
  // Proyectos donde el admin confirmó quitarle el rol al Owner actual. Se
  // exige la confirmación explícita en vez de desplazar siempre: un formulario
  // abierto hace rato podría sacar a alguien que pasó a ser Owner mientras
  // tanto, y eso sí tiene que frenar.
  const desplazar = new Set(
    formData.getAll("desplazarOwner").map(String).filter((id) => owners.includes(id)),
  );

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

    // Un proyecto inactivo no recibe asignaciones. El formulario ya ofrece solo
    // los activos, así que por la pantalla no se llega; el chequeo está porque
    // la regla es del servidor y no de la pantalla que la muestra.
    const inactivo = await clienteInactivoDe(clienteIds);
    if (inactivo) return { error: mensajeInactivo(inactivo) };
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

  // A quiénes hay que sacar del proyecto para que entre este usuario. Sin
  // confirmación, el choque sigue siendo un error.
  const desplazados = new Set<string>();
  for (const clienteId of owners) {
    const ocupado = ajenas.find((a) => a.clienteId === clienteId && a.rol === "owner");
    if (!ocupado) continue;
    if (!desplazar.has(clienteId)) {
      return {
        error: `"${ocupado.cliente.nombre}" ya tiene a ${ocupado.usuario.nombre} como Mentor Owner. Actualizá la pantalla para poder reemplazarlo.`,
      };
    }
    desplazados.add(ocupado.usuarioId);
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

      // El Owner saliente sale del proyecto entero, no solo del rol: se le
      // borra la asignación. Va DENTRO de la transacción y antes del upsert
      // porque el índice único parcial de owner por cliente no admite ni un
      // instante con dos, y va con `rol: "owner"` para no tocar a los backups
      // ni a quien tenga una asignación sin rol.
      if (desplazar.size > 0) {
        await tx.proyectoAsignado.deleteMany({
          where: {
            clienteId: { in: [...desplazar] },
            rol: "owner",
            usuarioId: { not: usuarioId },
          },
        });
      }

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
  // También la ficha de quien perdió el proyecto, o al abrirla seguiría
  // mostrándose como Owner de algo que ya no tiene.
  for (const id of desplazados) revalidatePath(`/admin/usuarios/${id}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/mi-perfil");
  // El layout de proyectos cubre la ficha del proyecto y su Equipo.
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
  // Quién ve qué proyecto cambió, y el informe se arma sobre eso.
  revalidatePath("/rentabilidad");
  return { ok: true };
}
