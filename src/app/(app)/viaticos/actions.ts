"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import {
  createAdminClient,
  asegurarBucketComprobantes,
  BUCKET_COMPROBANTES,
} from "@/lib/supabase/admin";

const ViaticoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
  clienteId: z.string().min(1, { error: "Elegí un proyecto." }),
  etapaId: z.string().min(1, { error: "Elegí una etapa." }),
  moneda: z.enum(["USD", "ARS"], { error: "Elegí la moneda." }),
  monto: z.coerce.number().positive({ error: "El monto debe ser mayor a cero." }),
  concepto: z.enum(["combustible", "alojamiento", "traslado", "almuerzo", "otros"], {
    error: "Elegí un concepto.",
  }),
});

type Resultado = { error?: string };

async function validarEntrada(usuarioId: string, formData: FormData) {
  const parsed = ViaticoSchema.safeParse({
    fecha: formData.get("fecha"),
    clienteId: formData.get("clienteId"),
    etapaId: formData.get("etapaId"),
    moneda: formData.get("moneda"),
    monto: formData.get("monto"),
    concepto: formData.get("concepto"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const fecha = new Date(parsed.data.fecha + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  if (fecha > hoy) return { error: "No se pueden cargar viáticos futuros." };

  const permitidos = await getProyectosPermitidos(usuarioId);
  if (!permitidos.some((c) => c.id === parsed.data.clienteId)) {
    return { error: "No tenés asignado ese proyecto." };
  }

  return { datos: { ...parsed.data, fecha } };
}

async function subirComprobante(
  usuarioId: string,
  archivo: File,
): Promise<{ path?: string; error?: string }> {
  if (archivo.size > 10 * 1024 * 1024) {
    return { error: "El archivo no puede superar los 10 MB." };
  }
  await asegurarBucketComprobantes();
  const supabase = createAdminClient();
  const nombreSeguro = archivo.name.replace(/[^\w.\-]/g, "_");
  const path = `${usuarioId}/${randomUUID()}-${nombreSeguro}`;
  const { error } = await supabase.storage
    .from(BUCKET_COMPROBANTES)
    .upload(path, archivo);
  if (error) {
    return { error: "No se pudo subir el comprobante. Probá de nuevo." };
  }
  return { path };
}

export async function crearViatico(
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const usuario = await requireGuest();

  const r = await validarEntrada(usuario.id, formData);
  if (r.error || !r.datos) return { error: r.error };

  let archivoPath: string | undefined;
  const archivo = formData.get("archivo");
  if (archivo instanceof File && archivo.size > 0) {
    const subida = await subirComprobante(usuario.id, archivo);
    if (subida.error) return { error: subida.error };
    archivoPath = subida.path;
  }

  await prisma.viatico.create({
    data: {
      fecha: r.datos.fecha,
      clienteId: r.datos.clienteId,
      etapaId: r.datos.etapaId,
      usuarioId: usuario.id,
      moneda: r.datos.moneda,
      monto: r.datos.monto,
      concepto: r.datos.concepto,
      archivoPath,
    },
  });

  revalidatePath("/viaticos");
  return {};
}

export async function actualizarViatico(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const existente = await prisma.viatico.findUnique({ where: { id } });
  if (!existente) return { error: "Viático no encontrado." };
  if (!esAdmin && existente.usuarioId !== usuario.id) {
    return { error: "No podés modificar viáticos de otra persona." };
  }

  const r = await validarEntrada(existente.usuarioId, formData);
  if (r.error || !r.datos) return { error: r.error };

  let archivoPath = existente.archivoPath;
  const archivo = formData.get("archivo");
  if (archivo instanceof File && archivo.size > 0) {
    const subida = await subirComprobante(existente.usuarioId, archivo);
    if (subida.error) return { error: subida.error };
    archivoPath = subida.path ?? archivoPath;
  }

  await prisma.viatico.update({
    where: { id },
    data: {
      fecha: r.datos.fecha,
      clienteId: r.datos.clienteId,
      etapaId: r.datos.etapaId,
      moneda: r.datos.moneda,
      monto: r.datos.monto,
      concepto: r.datos.concepto,
      archivoPath,
    },
  });

  revalidatePath("/viaticos");
  return {};
}

export async function eliminarViatico(id: string): Promise<void> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const existente = await prisma.viatico.findUnique({ where: { id } });
  if (!existente) throw new Error("Viático no encontrado.");
  if (!esAdmin && existente.usuarioId !== usuario.id) {
    throw new Error("No podés borrar viáticos de otra persona.");
  }

  await prisma.viatico.delete({ where: { id } });

  if (existente.archivoPath) {
    const supabase = createAdminClient();
    await supabase.storage
      .from(BUCKET_COMPROBANTES)
      .remove([existente.archivoPath]);
  }

  revalidatePath("/viaticos");
}
