"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clienteInactivoDe, mensajeInactivo } from "@/lib/cliente-activo";
import { tarifaVigenteA } from "@/lib/tarifas";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import { resolverUsuarioDestino } from "@/lib/registrar-para";
import { formatHorasHsMin, parseHorasHsMin } from "@/lib/horas";
import { SOLO_ACTIVOS, revalidarHoras } from "@/lib/registros-horas";
import { fechaDesdeISO, hoyUTC } from "@/lib/dias-habiles";
import type { Modalidad, Ownership } from "@/generated/prisma/client";

const RegistroSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
  clienteId: z.string().min(1, { error: "Elegí un cliente." }),
  conceptoId: z.string().min(1, { error: "Elegí un concepto." }),
  ownership: z.enum(["owner", "backup"], { error: "Elegí el ownership." }),
  modalidad: z.enum(["presencial", "virtual"], { error: "Elegí la modalidad." }),
  horas: z.string().min(1, { error: "Cargá las horas." }),
});

// El "campo" indica qué input tiene el error, para que el formulario resetee
// solo ése y conserve el resto de lo que el usuario ya cargó bien.
export type CampoRegistro =
  // El dueño de las horas. Es un campo del formulario desde que la carga es
  // multiusuario: el servidor puede rechazarlo y señalarlo como cualquier otro.
  | "usuarioId"
  | "fecha"
  | "clienteId"
  | "conceptoId"
  | "ownership"
  | "modalidad"
  | "horas";

type Resultado = { error?: string; campo?: CampoRegistro };

// Todo en UTC, como el resto del sistema: la columna es @db.Date y Prisma la
// lee y escribe a medianoche UTC. Construir la fecha con la hora local del
// proceso mezclaba dos criterios —el import ya usaba UTC y la carga manual
// no— y en un servidor con offset positivo la misma fecha se habría guardado
// un día antes.
function validarFecha(fechaISO: string): { fecha?: Date; error?: string } {
  const fecha = fechaDesdeISO(fechaISO);
  if (isNaN(fecha.getTime())) return { error: "Fecha inválida." };

  // Hoy sí se puede cargar: la comparación es contra la medianoche de hoy y
  // el corte queda estrictamente después.
  if (fecha > hoyUTC()) return { error: "No se pueden cargar horas futuras." };

  return { fecha };
}

// La tarifa que regía EN LA FECHA DEL REGISTRO, no la de hoy. La regla vive en
// lib/tarifas; acá solo se traen las candidatas.
async function resolverTarifa(
  usuarioId: string,
  modalidad: Modalidad,
  ownership: Ownership,
  fecha: Date,
): Promise<number | null> {
  const tarifas = await prisma.tarifa.findMany({
    where: { usuarioId, modalidad, ownership },
    select: { valorUsd: true, vigenteDesde: true, vigenteHasta: true },
  });
  return tarifaVigenteA(
    tarifas.map((t) => ({
      valorUsd: Number(t.valorUsd),
      vigenteDesde: t.vigenteDesde,
      vigenteHasta: t.vigenteHasta,
    })),
    fecha,
  );
}

async function validarEntrada(usuarioId: string, formData: FormData) {
  const parsed = RegistroSchema.safeParse({
    fecha: formData.get("fecha"),
    clienteId: formData.get("clienteId"),
    conceptoId: formData.get("conceptoId"),
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

  // El concepto es global y curado: solo se exige que exista y esté activo,
  // para no dejar cargar contra uno retirado.
  const concepto = await prisma.concepto.findFirst({
    where: { id: parsed.data.conceptoId, activo: true },
    select: { id: true },
  });
  if (!concepto) {
    return { error: "Ese concepto no existe.", campo: "conceptoId" as const };
  }

  const tarifa = await resolverTarifa(
    usuarioId,
    parsed.data.modalidad,
    parsed.data.ownership,
    fecha,
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
  const actor = await requireGuest();

  // A quién pertenecen las horas. Un admin puede cargar en nombre de otro
  // mentor; cualquier otro rol queda atado a sí mismo (se valida acá, en el
  // servidor, no solo escondiendo el selector en la UI).
  const destinoRes = await resolverUsuarioDestino(
    actor,
    formData.get("usuarioId") as string | null,
  );
  if (!destinoRes.ok) return { error: destinoRes.error };
  const destino = destinoRes.destino;

  // Cliente asignado y tarifa se validan contra el usuario dueño de las
  // horas, no contra quien las está cargando.
  const r = await validarEntrada(destino.id, formData);
  if (r.error || !r.datos) return { error: r.error, campo: r.campo };
  const d = r.datos;

  await prisma.registroHoras.create({
    data: {
      fecha: d.fecha,
      clienteId: d.clienteId,
      conceptoId: d.conceptoId,
      usuarioId: destino.id, // worked_by
      horas: d.horas,
      modalidad: d.modalidad,
      ownership: d.ownership,
      tarifaUsdAplicada: d.tarifa,
      montoUsd: Math.round(d.horas * d.tarifa * 100) / 100,
      creadoPorId: actor.id, // reported_by
    },
  });

  revalidarHoras();
  return {};
}

// Solo el dueño del registro (o un admin) puede modificarlo. Ya no hay
// ventana de tiempo: el historial completo es editable, y por eso cada edición
// deja registrado quién la hizo.
async function registroEditable(id: string, usuarioId: string, esAdmin: boolean) {
  const registro = await prisma.registroHoras.findUnique({ where: { id } });
  if (!registro || registro.eliminadoEn) return { error: "Registro no encontrado." };
  if (!esAdmin && registro.usuarioId !== usuarioId) {
    return { error: "No podés modificar registros de otra persona." };
  }
  return { registro };
}

// Guardado de UN campo, disparado por la edición inline de la tabla. El resto
// de los valores se leen del registro guardado y se vuelven a validar en
// conjunto: así las reglas cruzadas (la tarifa depende de modalidad +
// ownership, el cliente tiene que estar asignado) siguen valiendo aunque el
// usuario haya tocado una sola celda.
export async function actualizarCampoRegistro(
  id: string,
  campo: CampoRegistro,
  valor: string,
): Promise<Resultado> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const check = await registroEditable(id, usuario.id, esAdmin);
  if (check.error || !check.registro) return { error: check.error };
  const registro = check.registro;

  // Un cliente inactivo no recibe cambios, tampoco sobre lo que ya tiene: sus
  // registros historicos se miran.
  const inactivo = await clienteInactivoDe([registro.clienteId]);
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  const fd = new FormData();
  fd.set("fecha", campo === "fecha" ? valor : registro.fecha.toISOString().slice(0, 10));
  fd.set("clienteId", campo === "clienteId" ? valor : registro.clienteId);
  fd.set("conceptoId", campo === "conceptoId" ? valor : (registro.conceptoId ?? ""));
  fd.set("ownership", campo === "ownership" ? valor : registro.ownership);
  fd.set("modalidad", campo === "modalidad" ? valor : registro.modalidad);
  fd.set("horas", campo === "horas" ? valor : formatHorasHsMin(Number(registro.horas)));

  const r = await validarEntrada(registro.usuarioId, fd);
  if (r.error || !r.datos) return { error: r.error, campo: r.campo };
  const d = r.datos;

  await prisma.registroHoras.update({
    where: { id },
    data: {
      fecha: d.fecha,
      clienteId: d.clienteId,
      conceptoId: d.conceptoId,
      horas: d.horas,
      modalidad: d.modalidad,
      ownership: d.ownership,
      tarifaUsdAplicada: d.tarifa,
      montoUsd: Math.round(d.horas * d.tarifa * 100) / 100,
      // Editar pisa el valor viejo sin dejar rastro. updatedAt ya guarda
      // cuándo; esto guarda quién, que es lo que permite preguntar.
      editadoPorId: usuario.id,
    },
  });

  revalidarHoras();
  return {};
}

// Devuelve el error en vez de tirarlo: el boton de eliminar sabe mostrarlo y
// no anunciar que se borro. Tirar dejaba la pantalla rota para decir algo que
// se puede decir en un aviso.
export async function eliminarRegistro(id: string): Promise<Resultado> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";

  const check = await registroEditable(id, usuario.id, esAdmin);
  if (check.error || !check.registro) return { error: check.error };

  const inactivo = await clienteInactivoDe([check.registro.clienteId]);
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  // Borrado lógico: va a la papelera, se puede restaurar.
  await prisma.registroHoras.update({
    where: { id },
    data: { eliminadoEn: new Date() },
  });
  revalidarHoras();
  return {};
}

// Borrado masivo de las filas seleccionadas (solo las propias, o cualquiera
// si es admin), también lógico.
export async function eliminarRegistros(ids: string[]): Promise<Resultado> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  if (ids.length === 0) return {};

  // Se frena toda la seleccion y no solo las filas del inactivo: borrar la
  // mitad de lo que se pidio, en silencio, es peor que no borrar nada.
  const afectados = await prisma.registroHoras.findMany({
    where: { id: { in: ids } },
    select: { clienteId: true },
  });
  const inactivo = await clienteInactivoDe(afectados.map((r) => r.clienteId));
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  await prisma.registroHoras.updateMany({
    where: {
      id: { in: ids },
      ...SOLO_ACTIVOS,
      ...(esAdmin ? {} : { usuarioId: usuario.id }),
    },
    data: { eliminadoEn: new Date() },
  });
  revalidarHoras();
  return {};
}

export type CampoMasivo = "clienteId" | "conceptoId" | "ownership" | "modalidad";

// Edición masiva: aplica un mismo valor a un campo en las filas
// seleccionadas. Si el campo cambia la tarifa (modalidad/ownership), se
// recalcula el monto de cada fila con su cantidad de horas. Las filas fuera
// de la ventana de edición o sin tarifa para la nueva combinación se saltean.
export async function editarRegistros(
  ids: string[],
  campo: CampoMasivo,
  valor: string,
): Promise<{ error?: string; actualizados?: number }> {
  const usuario = await requireGuest();
  const esAdmin = usuario.rol === "admin";
  if (ids.length === 0) return { actualizados: 0 };

  const filas = await prisma.registroHoras.findMany({
    where: {
      id: { in: ids },
      ...SOLO_ACTIVOS,
      ...(esAdmin ? {} : { usuarioId: usuario.id }),
    },
  });

  const inactivo = await clienteInactivoDe(filas.map((f) => f.clienteId));
  if (inactivo) return { error: mensajeInactivo(inactivo) };

  // Validaciones del valor según el campo.
  if (campo === "clienteId") {
    // El cliente se valida contra el DUEÑO de cada fila, no contra quien
    // ejecuta la edición: si un admin edita en masa las horas de otro
    // mentor, el cliente tiene que estar asignado a ese mentor.
    const duenos = new Set(filas.map((f) => f.usuarioId));
    for (const duenoId of duenos) {
      const permitidos = await getProyectosPermitidos(duenoId);
      if (!permitidos.some((c) => c.id === valor)) {
        // Mismo motivo que en el alta: un inactivo tampoco esta en
        // `permitidos`, y decir "no lo tenes asignado" manda a buscar el
        // problema donde no esta.
        const inactivo = await prisma.cliente.findFirst({
          where: { id: valor, activo: false },
          select: { nombre: true },
        });
        if (inactivo) {
          return {
            error: `"${inactivo.nombre}" está inactivo: no admite registros nuevos.`,
          };
        }
        return {
          error:
            duenoId === usuario.id
              ? "No tenés asignado ese cliente."
              : "Ese cliente no está asignado al usuario dueño de las horas.",
        };
      }
    }
  }
  if (campo === "ownership" && valor !== "owner" && valor !== "backup") {
    return { error: "Ownership inválido." };
  }
  if (campo === "modalidad" && valor !== "presencial" && valor !== "virtual") {
    return { error: "Modalidad inválida." };
  }
  if (campo === "conceptoId") {
    // El concepto es global: se puede aplicar a filas de distintos clientes.
    const concepto = await prisma.concepto.findFirst({
      where: { id: valor, activo: true },
      select: { id: true },
    });
    if (!concepto) return { error: "Concepto inválido." };
  }

  let actualizados = 0;

  for (const fila of filas) {
    if (campo === "clienteId") {
      // El concepto no se toca: clasifica la actividad y sigue valiendo
      // aunque las horas se muevan a otro proyecto.
      await prisma.registroHoras.update({
        where: { id: fila.id },
        data: { clienteId: valor, editadoPorId: usuario.id },
      });
    } else if (campo === "conceptoId") {
      await prisma.registroHoras.update({
        where: { id: fila.id },
        data: { conceptoId: valor, editadoPorId: usuario.id },
      });
    } else {
      const modalidad = (campo === "modalidad" ? valor : fila.modalidad) as Modalidad;
      const ownership = (campo === "ownership" ? valor : fila.ownership) as Ownership;
      const tarifa = await resolverTarifa(
        fila.usuarioId,
        modalidad,
        ownership,
        fila.fecha,
      );
      if (tarifa === null) continue; // sin tarifa para esa combinación
      await prisma.registroHoras.update({
        where: { id: fila.id },
        data: {
          modalidad,
          ownership,
          tarifaUsdAplicada: tarifa,
          montoUsd: Math.round(Number(fila.horas) * tarifa * 100) / 100,
          editadoPorId: usuario.id,
        },
      });
    }
    actualizados += 1;
  }

  revalidarHoras();
  return { actualizados };
}
