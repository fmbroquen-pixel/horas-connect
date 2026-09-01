"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteInactivoDe, mensajeInactivo } from "@/lib/cliente-activo";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import { resolverUsuarioDestino } from "@/lib/registrar-para";
import { fechaDesdeISO, hoyUTC } from "@/lib/dias-habiles";
import {
  createAdminClient,
  asegurarBucketComprobantes,
  BUCKET_COMPROBANTES,
} from "@/lib/supabase/admin";

const ViaticoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
  clienteId: z.string().min(1, { error: "Elegí un cliente." }),
  moneda: z.enum(["USD", "ARS"], { error: "Elegí la moneda." }),
  monto: z.coerce.number().positive({ error: "El monto debe ser mayor a cero." }),
  concepto: z.enum(["combustible", "alojamiento", "traslado", "almuerzo", "otros"], {
    error: "Elegí un concepto.",
  }),
});

export type CampoViatico =
  | "fecha"
  | "clienteId"
  | "moneda"
  | "monto"
  | "concepto";

type Resultado = { error?: string; campo?: CampoViatico };

function revalidar() {
  revalidatePath("/viaticos");
  revalidatePath("/proyectos", "layout");
}

// Valida los campos contra el usuario DUEÑO del gasto: los clientes
// permitidos son los suyos, no los de quien está cargando.
async function validarEntrada(usuarioId: string, formData: FormData) {
  const parsed = ViaticoSchema.safeParse({
    fecha: formData.get("fecha"),
    clienteId: formData.get("clienteId"),
    moneda: formData.get("moneda"),
    monto: formData.get("monto"),
    concepto: formData.get("concepto"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Datos inválidos.",
      campo: issue?.path[0] as CampoViatico | undefined,
    };
  }

  // En UTC, como la columna @db.Date y como Time Tracking.
  const fecha = fechaDesdeISO(parsed.data.fecha);
  if (fecha > hoyUTC()) {
    return { error: "No se pueden cargar viáticos futuros.", campo: "fecha" as const };
  }

  const permitidos = await getProyectosPermitidos(usuarioId);
  if (!permitidos.some((c) => c.id === parsed.data.clienteId)) {
    // Un cliente inactivo tampoco esta en `permitidos`, pero por otro motivo:
    // decirle "no lo tenes asignado" a alguien que lo tiene asignado y lo ve en
    // la tabla del mes pasado manda a buscar el problema al lugar equivocado.
    const inactivo = await prisma.cliente.findFirst({
      where: { id: parsed.data.clienteId, activo: false },
      select: { nombre: true },
    });
    if (inactivo) {
      return {
        error: `"${inactivo.nombre}" está inactivo: no admite registros nuevos.`,
        campo: "clienteId" as const,
      };
    }
    return { error: "No tenés asignado ese cliente.", campo: "clienteId" as const };
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

// Alta desde la barra de captura. Distingue dos personas, igual que la carga
// de horas:
//   · el DUEÑO del gasto (usuarioId), que puede ser otro si lo carga un admin;
//   · quien lo INGRESÓ (creadoPorId), que es siempre el actor de la sesión.
// La resolución del dueño corre entera en el servidor: un usuario que no sea
// admin queda atado a sí mismo aunque manipule el campo oculto del formulario.
export async function crearViatico(
  _prevState: unknown,
  formData: FormData,
): Promise<Resultado> {
  const actor = await requireGuest();

  const destinoRes = await resolverUsuarioDestino(
    actor,
    formData.get("usuarioId")?.toString(),
    "viáticos",
  );
  if (!destinoRes.ok) return { error: destinoRes.error };
  const destino = destinoRes.destino;

  const r = await validarEntrada(destino.id, formData);
  if (r.error || !r.datos) return { error: r.error, campo: r.campo };

  let archivoPath: string | undefined;
  const archivo = formData.get("archivo");
  if (archivo instanceof File && archivo.size > 0) {
    const subida = await subirComprobante(destino.id, archivo);
    if (subida.error) return { error: subida.error };
    archivoPath = subida.path;
  }

  await prisma.viatico.create({
    data: {
      fecha: r.datos.fecha,
      clienteId: r.datos.clienteId,
      usuarioId: destino.id,
      creadoPorId: actor.id,
      moneda: r.datos.moneda,
      monto: r.datos.monto,
      concepto: r.datos.concepto,
      archivoPath,
    },
  });

  revalidar();
  return {};
}

// Guardado de UN campo, disparado por la edición inline de la tabla. Mismo
// contrato que actualizarCampoRegistro en Time Tracking: el resto de los
// valores se leen del viático guardado y se vuelven a validar en conjunto, así
// las reglas cruzadas (el cliente tiene que estar asignado, la fecha no puede
// ser futura) siguen valiendo aunque se haya tocado una sola celda.
export async function actualizarCampoViatico(
  id: string,
  campo: CampoViatico,
  valor: string,
): Promise<Resultado> {
  const actor = await requireGuest();
  const esAdmin = actor.rol === "admin";

  const existente = await prisma.viatico.findUnique({ where: { id } });
  if (!existente || existente.eliminadoEn) return { error: "Viático no encontrado." };
  if (!esAdmin && existente.usuarioId !== actor.id) {
    return { error: "No podés modificar viáticos de otra persona." };
  }

  const inactivo = await clienteInactivoDe([existente.clienteId]);
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  const fd = new FormData();
  fd.set("fecha", campo === "fecha" ? valor : existente.fecha.toISOString().slice(0, 10));
  fd.set("clienteId", campo === "clienteId" ? valor : existente.clienteId);
  fd.set("concepto", campo === "concepto" ? valor : existente.concepto);
  fd.set("moneda", campo === "moneda" ? valor : existente.moneda);
  fd.set("monto", campo === "monto" ? valor : String(existente.monto));

  const r = await validarEntrada(existente.usuarioId, fd);
  if (r.error || !r.datos) return { error: r.error, campo: r.campo };

  await prisma.viatico.update({
    where: { id },
    data: {
      editadoPorId: actor.id,
      fecha: r.datos.fecha,
      clienteId: r.datos.clienteId,
      moneda: r.datos.moneda,
      monto: r.datos.monto,
      concepto: r.datos.concepto,
    },
  });

  revalidar();
  return {};
}

// El comprobante se reemplaza aparte: es un archivo y no entra en una celda de
// texto. Sube el nuevo y deja de apuntar al anterior.
export async function actualizarComprobante(
  id: string,
  formData: FormData,
): Promise<Resultado> {
  const actor = await requireGuest();
  const esAdmin = actor.rol === "admin";

  const existente = await prisma.viatico.findUnique({ where: { id } });
  if (!existente || existente.eliminadoEn) return { error: "Viático no encontrado." };
  if (!esAdmin && existente.usuarioId !== actor.id) {
    return { error: "No podés modificar viáticos de otra persona." };
  }

  const inactivo = await clienteInactivoDe([existente.clienteId]);
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "No llegó ningún archivo." };
  }
  const subida = await subirComprobante(existente.usuarioId, archivo);
  if (subida.error) return { error: subida.error };

  await prisma.viatico.update({
    where: { id },
    data: { archivoPath: subida.path, editadoPorId: actor.id },
  });

  revalidar();
  return {};
}


// Devuelve el error en vez de tirarlo: el boton de eliminar sabe mostrarlo.
export async function eliminarViatico(id: string): Promise<Resultado> {
  const actor = await requireGuest();
  const esAdmin = actor.rol === "admin";

  const existente = await prisma.viatico.findUnique({ where: { id } });
  // Ya en papelera: no se vuelve a borrar. Hacerlo pisaría la fecha de
  // eliminación original, que es el dato con el que se cuenta la retención.
  if (!existente || existente.eliminadoEn) return { error: "Viático no encontrado." };
  if (!esAdmin && existente.usuarioId !== actor.id) {
    return { error: "No podés borrar viáticos de otra persona." };
  }

  const inactivo = await clienteInactivoDe([existente.clienteId]);
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  // Borrado lógico: va a la papelera. El comprobante se conserva para poder
  // restaurar; solo se borra del storage si el viático se elimina para
  // siempre desde la papelera.
  await prisma.viatico.update({
    where: { id },
    data: { eliminadoEn: new Date() },
  });

  revalidar();
  return {};
}
