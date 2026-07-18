"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getSesionActual } from "@/lib/auth";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { ETIQUETA_PRODUCTO, ETIQUETA_ROL_EQUIPO } from "./constantes";

// El equipo del cliente se gestiona desde Settings (solo admin) y desde la
// pestaña Equipo del proyecto (admin o mentor con ese cliente asignado).
async function requireGestionEquipo(clienteId: string) {
  const sesion = await getSesionActual();
  if (sesion.estado === "autorizado" && sesion.usuario.rol === "admin") {
    return sesion.usuario;
  }
  const acceso = await getAccesoProyecto(clienteId);
  if (!acceso) throw new Error("No autorizado.");
  return acceso.usuario;
}

// Refresca las dos vistas que muestran el equipo del cliente.
function revalidarEquipo(clienteId: string) {
  revalidatePath(`/admin/clientes/${clienteId}/equipo`);
  revalidatePath("/proyectos", "layout");
}

const ClienteSchema = z.object({
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
});

export async function crearCliente(_prevState: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = ClienteSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.cliente.create({ data: { nombre: parsed.data.nombre } });
  revalidatePath("/admin/clientes");
  return { error: undefined };
}

export async function alternarActivoCliente(id: string, activo: boolean) {
  await requireAdmin();
  await prisma.cliente.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/clientes");
}

// Datos del servicio del cliente (pestaña Datos del detalle). La fecha de
// finalización no se recibe ni se guarda: siempre se calcula como
// fechaInicio + duracionMeses.
const DatosClienteSchema = z.object({
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  duracionMeses: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1), {
      error: "La duración debe ser un número entero de meses (mínimo 1).",
    }),
  producto: z
    .string()
    .trim()
    .refine((v) => v === "" || v in ETIQUETA_PRODUCTO, {
      error: "Producto inválido.",
    }),
  fechaInicio: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: "Fecha de inicio inválida.",
    }),
});

export async function actualizarDatosCliente(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = DatosClienteSchema.safeParse({
    nombre: formData.get("nombre"),
    duracionMeses: formData.get("duracionMeses") ?? "",
    producto: formData.get("producto") ?? "",
    fechaInicio: formData.get("fechaInicio") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.cliente.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      duracionMeses: parsed.data.duracionMeses,
      producto: parsed.data.producto || null,
      fechaInicio: parsed.data.fechaInicio
        ? new Date(parsed.data.fechaInicio + "T00:00:00Z")
        : null,
    },
  });
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  return { error: undefined };
}

// ── Equipo del cliente ────────────────────────────────────────────────────

const MiembroSchema = z.object({
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  apellido: z.string().trim().min(1, { error: "El apellido es obligatorio." }),
  rol: z
    .string()
    .refine((v) => v in ETIQUETA_ROL_EQUIPO, { error: "Elegí un rol." }),
  cumpleanos: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: "Fecha de cumpleaños inválida.",
    }),
});

function parseMiembro(formData: FormData) {
  return MiembroSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    rol: formData.get("rol"),
    cumpleanos: formData.get("cumpleanos") ?? "",
  });
}

export async function crearMiembro(
  clienteId: string,
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireGestionEquipo(clienteId);
  const parsed = parseMiembro(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.miembroEquipo.create({
    data: {
      clienteId,
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      rol: parsed.data.rol,
      cumpleanos: parsed.data.cumpleanos
        ? new Date(parsed.data.cumpleanos + "T00:00:00Z")
        : null,
    },
  });
  revalidarEquipo(clienteId);
  return { error: undefined };
}

export async function actualizarMiembro(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const existente = await prisma.miembroEquipo.findUnique({ where: { id } });
  if (!existente) return { error: "Integrante inexistente." };
  await requireGestionEquipo(existente.clienteId);

  const parsed = parseMiembro(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.miembroEquipo.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      rol: parsed.data.rol,
      cumpleanos: parsed.data.cumpleanos
        ? new Date(parsed.data.cumpleanos + "T00:00:00Z")
        : null,
    },
  });
  revalidarEquipo(existente.clienteId);
  return { error: undefined };
}

export async function eliminarMiembro(id: string) {
  const existente = await prisma.miembroEquipo.findUnique({ where: { id } });
  if (!existente) return;
  await requireGestionEquipo(existente.clienteId);

  await prisma.miembroEquipo.delete({ where: { id } });
  revalidarEquipo(existente.clienteId);
}
