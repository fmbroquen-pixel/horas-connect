"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getSesionActual } from "@/lib/auth";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { asegurarRoadmap } from "@/lib/roadmap";
import { Prisma } from "@/generated/prisma/client";
import { ETIQUETA_PRODUCTO, ETIQUETA_ROL_EQUIPO } from "./constantes";
import type { ResultadoEstado } from "@/components/boton-estado";

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

// Campos del cliente. El "campo" que viaja con cada error permite mostrarlo
// debajo del input que lo produjo en vez de en un cartel suelto.
export type CampoCliente =
  | "nombre"
  | "producto"
  | "duracionMeses"
  | "fechaInicio"
  | "valorCuotaUsd";

export type ResultadoCliente = { error?: string; campo?: CampoCliente };

const CUOTA_INVALIDA =
  "El valor de la cuota debe ser un número mayor o igual a 0.";

// Acepta 1234.56 y 1234,56 (la coma es lo natural al tipear en es-AR).
function parseCuota(valor: unknown): number | null {
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// El alta pide todo lo que define al proyecto: con la duración y la fecha se
// genera el Roadmap en el mismo momento, y producto y cuota completan la
// ficha comercial para que ningún cliente quede a medio cargar.
const ClienteSchema = z.object({
  nombre: z.string().trim().min(1, { error: "El nombre es obligatorio." }),
  producto: z
    .string()
    .trim()
    .refine((v) => v in ETIQUETA_PRODUCTO, { error: "Elegí un producto." }),
  duracionMeses: z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v >= 1, {
      error: "La duración debe ser un número entero de meses (mínimo 1).",
    }),
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "La fecha de inicio es obligatoria." }),
});

export async function crearCliente(
  _prevState: unknown,
  formData: FormData,
): Promise<ResultadoCliente> {
  await requireAdmin();
  const parsed = ClienteSchema.safeParse({
    nombre: formData.get("nombre"),
    producto: formData.get("producto"),
    duracionMeses: formData.get("duracionMeses"),
    fechaInicio: formData.get("fechaInicio"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Datos inválidos.",
      campo: issue?.path[0] as CampoCliente | undefined,
    };
  }

  const valorCuotaUsd = parseCuota(formData.get("valorCuotaUsd"));
  if (valorCuotaUsd === null) {
    return { error: CUOTA_INVALIDA, campo: "valorCuotaUsd" };
  }

  // El nombre es único en la base; sin este chequeo, el duplicado revienta
  // la action con un error de servidor en vez de un aviso en el modal. Se
  // compara sin distinguir mayúsculas para frenar también "andreu"/"Andreu".
  const repetido = await prisma.cliente.findFirst({
    where: { nombre: { equals: parsed.data.nombre, mode: "insensitive" } },
    select: { nombre: true },
  });
  if (repetido) {
    return {
      error: `Ya existe un cliente con ese nombre ("${repetido.nombre}"). Elegí otro.`,
      campo: "nombre",
    };
  }

  let cliente;
  try {
    cliente = await prisma.cliente.create({
      data: {
        nombre: parsed.data.nombre,
        producto: parsed.data.producto,
        duracionMeses: parsed.data.duracionMeses,
        fechaInicio: new Date(parsed.data.fechaInicio + "T00:00:00Z"),
        valorCuotaUsd,
      },
    });
  } catch (e) {
    // Carrera entre el chequeo y el insert (dos altas simultáneas): la
    // restricción única de la base es la última línea de defensa y también
    // tiene que terminar en un aviso, no en una pantalla de error.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un cliente con ese nombre. Elegí otro.", campo: "nombre" };
    }
    throw e;
  }

  // Con la duración y la fecha ya definidas, el plan por defecto se crea
  // acá mismo: el cliente nace con su Roadmap y con tareas disponibles en
  // Time Tracking, sin esperar a que alguien abra la pestaña.
  await asegurarRoadmap(cliente);

  revalidatePath("/admin/clientes");
  revalidatePath("/proyectos", "layout");
  revalidatePath("/timetracker");

  // El alta termina en la ficha del cliente recién creado (pestaña Datos):
  // es donde se sigue completando. redirect() corta la ejecución lanzando,
  // así que va después de revalidar y fuera de cualquier try/catch.
  redirect(`/admin/clientes/${cliente.id}`);
}

// Devuelve un resultado en vez de no devolver nada: quien la llama necesita
// saber si salio bien para avisarlo, y un fallo tiene que llegar como mensaje y
// no como una pantalla rota.
export async function alternarActivoCliente(
  id: string,
  activo: boolean,
): Promise<ResultadoEstado> {
  await requireAdmin();
  // Se guarda DESDE CUANDO dejo de operar, no solo que esta apagado. Es lo que
  // permite despues distinguir "no aparece en el selector de carga" de "no
  // existio nunca": las consultas de un periodo anterior lo siguen incluyendo.
  //
  // Al reactivar la fecha se limpia: vuelve a operar sin corte.
  await prisma.cliente.update({
    where: { id },
    data: { activo, inactivadoEn: activo ? null : new Date() },
  });
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  // Proyectos (Activos/Inactivos) y el widget de Home filtran clientes por activo.
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
  return { ok: true };
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
): Promise<ResultadoCliente> {
  await requireAdmin();
  const parsed = DatosClienteSchema.safeParse({
    nombre: formData.get("nombre"),
    duracionMeses: formData.get("duracionMeses") ?? "",
    producto: formData.get("producto") ?? "",
    fechaInicio: formData.get("fechaInicio") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Datos inválidos.",
      campo: issue?.path[0] as CampoCliente | undefined,
    };
  }

  // La cuota es obligatoria también al editar: los clientes cargados antes de
  // que existiera el campo lo tienen vacío, y este guard es lo que fuerza a
  // completarlo la próxima vez que se toquen sus datos.
  const valorCuotaUsd = parseCuota(formData.get("valorCuotaUsd"));
  if (valorCuotaUsd === null) {
    return { error: CUOTA_INVALIDA, campo: "valorCuotaUsd" };
  }

  // Renombrar también puede chocar con la restricción única del nombre; el
  // choque tiene que volver como aviso al formulario, no como error de
  // servidor. Se excluye al propio cliente para permitir cambios de
  // mayúsculas sobre sí mismo.
  const repetido = await prisma.cliente.findFirst({
    where: {
      id: { not: id },
      nombre: { equals: parsed.data.nombre, mode: "insensitive" },
    },
    select: { nombre: true },
  });
  if (repetido) {
    return {
      error: `Ya existe un cliente con ese nombre ("${repetido.nombre}"). Elegí otro.`,
      campo: "nombre",
    };
  }

  // Update por id: renombrar cambia solo la etiqueta visible. El id es un
  // cuid inmutable y todo lo demás (horas, viáticos, Roadmap, equipo,
  // facturación, asignaciones) cuelga de él, así que nada se desvincula.
  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        nombre: parsed.data.nombre,
        duracionMeses: parsed.data.duracionMeses,
        producto: parsed.data.producto || null,
        valorCuotaUsd,
        fechaInicio: parsed.data.fechaInicio
          ? new Date(parsed.data.fechaInicio + "T00:00:00Z")
          : null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un cliente con ese nombre. Elegí otro.", campo: "nombre" };
    }
    throw e;
  }
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
