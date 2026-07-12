"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import { parseHorasHsMin } from "@/lib/horas";
import type { Modalidad, Ownership } from "@/generated/prisma/client";

const DIAS_VENTANA_EDICION = 30;

const RegistroSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
  clienteId: z.string().min(1, { error: "Elegí un proyecto." }),
  etapaId: z.string().min(1, { error: "Elegí una etapa." }),
  ownership: z.enum(["owner", "backup"], { error: "Elegí el ownership." }),
  modalidad: z.enum(["presencial", "virtual"], { error: "Elegí la modalidad." }),
  horas: z.string().min(1, { error: "Cargá las horas." }),
});

// El "campo" indica qué input tiene el error, para que el formulario resetee
// solo ése y conserve el resto de lo que el usuario ya cargó bien.
export type CampoRegistro =
  | "fecha"
  | "clienteId"
  | "etapaId"
  | "ownership"
  | "modalidad"
  | "horas";

type Resultado = { error?: string; campo?: CampoRegistro };

function limiteVentana(): Date {
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_VENTANA_EDICION);
  limite.setHours(0, 0, 0, 0);
  return limite;
}

function validarFecha(fechaISO: string): { fecha?: Date; error?: string } {
  const fecha = new Date(fechaISO + "T00:00:00");
  if (isNaN(fecha.getTime())) return { error: "Fecha inválida." };

  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  if (fecha > hoy) return { error: "No se pueden cargar horas futuras." };

  if (fecha < limiteVentana()) {
    return {
      error: `Solo se pueden cargar o modificar registros de los últimos ${DIAS_VENTANA_EDICION} días.`,
    };
  }
  return { fecha };
}

async function resolverTarifa(
  usuarioId: string,
  modalidad: Modalidad,
  ownership: Ownership,
): Promise<number | null> {
  const tarifa = await prisma.tarifa.findFirst({
    where: { usuarioId, modalidad, ownership, vigenteHasta: null },
  });
  return tarifa ? Number(tarifa.valorUsd) : null;
}

async function validarEntrada(usuarioId: string, formData: FormData) {
  const parsed = RegistroSchema.safeParse({
    fecha: formData.get("fecha"),
    clienteId: formData.get("clienteId"),
    etapaId: formData.get("etapaId"),
    ownership: formData.get("ownership"),
    modalidad: formData.get("modalidad"),
    horas: formData.get("horas"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Datos inválidos.",
      campo: issue?.path[0] as CampoRegistro | undefined,
    };
  }

  const { fecha, error: errorFecha } = validarFecha(parsed.data.fecha);
  if (errorFecha || !fecha) return { error: errorFecha, campo: "fecha" as const };

  const horas = parseHorasHsMin(parsed.data.horas);
  if (horas === null || horas <= 0 || horas > 24) {
    return {
      error: "Horas inválidas: cargá un número como 1,5 o el formato 1:30.",
      campo: "horas" as const,
    };
  }

  const permitidos = await getProyectosPermitidos(usuarioId);
  if (!permitidos.some((c) => c.id === parsed.data.clienteId)) {
    return { error: "No tenés asignado ese proyecto.", campo: "clienteId" as const };
  }

  const tarifa = await resolverTarifa(
    usuarioId,
    parsed.data.modalidad,
    parsed.data.ownership,
  );
  if (tarifa === null) {
    return {
      error:
        "No tenés una tarifa configurada para esa combinación. Contactá al administrador.",
      campo: "modalidad" as const,
    };
  }

  return { datos: { ...parsed.data, fecha, horas, tarifa } };
}

export async function crearRegistro(
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const usuario = await requireGuest();

  const r = await validarEntrada(usuario.id, formData);
  if (r.error || !r.datos) return { error: r.error, campo: r.campo };
  const d = r.datos;

  await prisma.registroHoras.create({
    data: {
      fecha: d.fecha,
      clienteId: d.clienteId,
      etapaId: d.etapaId,
      usuarioId: usuario.id,
      horas: d.horas,
      modalidad: d.modalidad,
      ownership: d.ownership,
      tarifaUsdAplicada: d.tarifa,
      montoUsd: Math.round(d.horas * d.tarifa * 100) / 100,
      creadoPorId: usuario.id,
    },
  });

  revalidatePath("/timetracker");
  revalidatePath("/dashboard");
  return {};
}

// Solo el dueño del registro (o un admin) puede modificarlo, y solo si la
// fecha original y la nueva están dentro de la ventana de 30 días.
async function registroEditable(id: string, usuarioId: string, esAdmin: boolean) {
  const registro = await prisma.registroHoras.findUnique({ where: { id } });
  if (!registro) return { error: "Registro no encontrado." };
  if (!esAdmin && registro.usuarioId !== usuarioId) {
    return { error: "No podés modificar registros de otra persona." };
  }
  if (!esAdmin && registro.fecha < limiteVentana()) {
    return {
      error: `Los registros de hace más de ${DIAS_VENTANA_EDICION} días ya no se pueden modificar.`,
    };
  }
  return { registro };
}

export async function actualizarRegistro(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const check = await registroEditable(id, usuario.id, esAdmin);
  if (check.error || !check.registro) return { error: check.error };

  const r = await validarEntrada(check.registro.usuarioId, formData);
  if (r.error || !r.datos) return { error: r.error, campo: r.campo };
  const d = r.datos;

  await prisma.registroHoras.update({
    where: { id },
    data: {
      fecha: d.fecha,
      clienteId: d.clienteId,
      etapaId: d.etapaId,
      horas: d.horas,
      modalidad: d.modalidad,
      ownership: d.ownership,
      tarifaUsdAplicada: d.tarifa,
      montoUsd: Math.round(d.horas * d.tarifa * 100) / 100,
    },
  });

  revalidatePath("/timetracker");
  revalidatePath("/dashboard");
  return {};
}

export async function eliminarRegistro(id: string): Promise<void> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const check = await registroEditable(id, usuario.id, esAdmin);
  if (check.error) throw new Error(check.error);

  await prisma.registroHoras.delete({ where: { id } });
  revalidatePath("/timetracker");
  revalidatePath("/dashboard");
}
