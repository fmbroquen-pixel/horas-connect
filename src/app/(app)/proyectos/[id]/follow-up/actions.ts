"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { parseHorasHsMin } from "@/lib/horas";
import {
  diasHabilesEntre,
  esDiaHabil,
  fechaDesdeISO,
  finTrasDiasHabiles,
  hoyUTC,
  isoDesdeFecha,
} from "@/lib/dias-habiles";
import { PLANTILLAS, getTareasEnOrden, resecuenciar, type DB } from "@/lib/roadmap";
import { SOLO_TAREAS_VIVAS, listasVivas, tareasVivas } from "@/lib/roadmap-papelera";
import { ETIQUETA_ESTADO } from "./constantes";
import type { EstadoTareaRoadmap } from "@/generated/prisma/client";

type Resultado = { error?: string };

// Toda escritura que mueva la secuencia va en una transacción junto con el
// reencadenado de fechas: son un solo hecho. Si el resecuenciado fallara
// después de la escritura, el plan quedaría con la tarea ya borrada (o creada)
// y las fechas viejas de todo lo que sigue, sin ninguna señal de error.
//
// El timeout va holgado porque resecuenciar escribe una fila por tarea movida,
// y un plan largo con la primera tarea corrida las toca todas.
function enSecuencia<T>(fn: (tx: DB) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { timeout: 20_000, maxWait: 10_000 });
}

// Campos que la tabla del Roadmap edita de a uno, en el lugar.
// Las fechas NO están acá: se editan juntas desde el calendario de rango
// (actualizarRangoTarea). Tener además un camino por campo suelto significaba
// dos formas de escribir lo mismo, con distinta normalización de la duración.
export type CampoTarea =
  | "nombre"
  | "horasEstimadas"
  | "estado"
  | "personas";

// El Roadmap alimenta los KPIs del proyecto y del Home. No toca el
// desplegable de Concepto de Time Tracking: ese catálogo es independiente.
function revalidar() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/dashboard");
}

async function requireAcceso(clienteId: string) {
  const acceso = await getAccesoProyecto(clienteId);
  if (!acceso) throw new Error("No autorizado.");
  return acceso;
}

// Resuelve el proyecto dueño de una lista y valida el acceso de una sola vez.
// Solo lo vivo: sobre algo que está en la papelera no se opera desde el plan,
// se opera desde la papelera.
async function listaConAcceso(listaId: string) {
  const lista = await prisma.listaRoadmap.findFirst({
    where: listasVivas({ id: listaId }),
  });
  if (!lista) return null;
  const { usuario } = await requireAcceso(lista.clienteId);
  return { ...lista, actor: usuario };
}

async function tareaConAcceso(tareaId: string) {
  const tarea = await prisma.tareaRoadmap.findFirst({
    where: { ...tareasVivas(), id: tareaId },
    include: { lista: true },
  });
  if (!tarea) return null;
  const { usuario } = await requireAcceso(tarea.lista.clienteId);
  return { ...tarea, actor: usuario };
}

// La tarea inmediatamente anterior en la secuencia del proyecto. Es el ancla
// del recálculo: todo lo previo mantiene sus fechas y solo se reencadena de
// ahí en adelante. Sin anterior (la tarea es la primera del plan) se devuelve
// undefined y se replanifica desde el arranque del proyecto.
async function anclaPrevia(
  clienteId: string,
  tareaId: string,
  db: DB = prisma,
): Promise<string | undefined> {
  const tareas = await getTareasEnOrden(clienteId, db);
  const i = tareas.findIndex((t) => t.id === tareaId);
  return i > 0 ? tareas[i - 1].id : undefined;
}

// Ancla para las operaciones sobre una lista entera: la tarea anterior a la
// primera de esa lista. Así agregar, copiar o borrar una lista no mueve nada
// de lo que venía antes.
async function anclaAntesDeLista(
  clienteId: string,
  listaId: string,
  db: DB = prisma,
): Promise<string | undefined> {
  const primera = await db.tareaRoadmap.findFirst({
    where: { ...SOLO_TAREAS_VIVAS, listaId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return primera ? anclaPrevia(clienteId, primera.id, db) : undefined;
}

// ── Listas ────────────────────────────────────────────────────────────────

const NombreSchema = z.string().trim().min(1, { error: "El nombre es obligatorio." });

export async function crearLista(
  clienteId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const { cliente } = await requireAcceso(clienteId);

  const parsed = NombreSchema.safeParse(formData.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Opcionalmente arranca con las tareas de una plantilla; si no, queda vacía
  // y el usuario la arma a mano.
  const plantillaNombre = String(formData.get("plantilla") ?? "");
  const plantilla = PLANTILLAS.find((p) => p.nombre === plantillaNombre);

  await enSecuencia(async (tx) => {
    const ultima = await tx.listaRoadmap.findFirst({
      where: listasVivas({ clienteId }),
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const lista = await tx.listaRoadmap.create({
      data: {
        clienteId,
        nombre: parsed.data,
        orden: (ultima?.orden ?? -1) + 1,
      },
    });

    if (plantilla) {
      // Fechas provisorias: resecuenciar las reescribe encadenándolas al final
      // del plan. Se necesita un valor porque las columnas no son opcionales.
      const provisoria = cliente.fechaInicio ?? new Date();
      await tx.tareaRoadmap.createMany({
        data: plantilla.tareas.map((t, i) => ({
          listaId: lista.id,
          nombre: t.nombre,
          orden: i,
          duracionDias: t.duracionDias,
          horasEstimadas: t.horasEstimadas,
          fechaInicio: provisoria,
          fechaFin: provisoria,
        })),
      });
    }

    const ancla = await anclaAntesDeLista(clienteId, lista.id, tx);
    await resecuenciar(clienteId, ancla, undefined, tx);
  });

  revalidar();
  return {};
}

export async function renombrarLista(
  listaId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const lista = await listaConAcceso(listaId);
  if (!lista) return { error: "Lista inexistente." };

  const parsed = NombreSchema.safeParse(formData.get("nombre"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.listaRoadmap.update({
    where: { id: listaId },
    data: { nombre: parsed.data },
  });
  revalidar();
  return {};
}

export async function eliminarLista(listaId: string): Promise<void> {
  const lista = await listaConAcceso(listaId);
  if (!lista) return;

  await enSecuencia(async (tx) => {
    // El ancla se resuelve antes de borrar, mientras las tareas todavía están
    // en la secuencia.
    const ancla = await anclaAntesDeLista(lista.clienteId, listaId, tx);

    // A la papelera, no al vacío. Las tareas de la lista NO se marcan: la
    // lista las tapa mientras esté eliminada, y restaurarla las devuelve con
    // su orden y sus datos intactos.
    //
    // Las horas cargadas tampoco se tocan: su dato vivo es cliente +
    // concepto, que sobreviven a la lista.
    await tx.listaRoadmap.update({
      where: { id: listaId },
      data: { eliminadoEn: new Date(), eliminadoPorId: lista.actor.id },
    });

    await resecuenciar(lista.clienteId, ancla, undefined, tx);
  });

  revalidar();
}

// Copia una lista con todas sus tareas al final del plan. Sirve para armar el
// tablero del trimestre siguiente a partir del anterior ya ajustado.
export async function duplicarLista(listaId: string): Promise<void> {
  const lista = await prisma.listaRoadmap.findFirst({
    where: listasVivas({ id: listaId }),
    include: {
      tareas: {
        where: SOLO_TAREAS_VIVAS,
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!lista) return;
  await requireAcceso(lista.clienteId);

  await enSecuencia(async (tx) => {
    const ultima = await tx.listaRoadmap.findFirst({
      where: listasVivas({ clienteId: lista.clienteId }),
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const copia = await tx.listaRoadmap.create({
      data: {
        clienteId: lista.clienteId,
        nombre: `${lista.nombre} (copia)`,
        orden: (ultima?.orden ?? -1) + 1,
      },
    });

    if (lista.tareas.length > 0) {
      await tx.tareaRoadmap.createMany({
        data: lista.tareas.map((t, i) => ({
          listaId: copia.id,
          nombre: t.nombre,
          orden: i,
          duracionDias: t.duracionDias,
          horasEstimadas: t.horasEstimadas,
          // El estado no se copia: la lista nueva arranca sin ejecutar.
          fechaInicio: t.fechaInicio,
          fechaFin: t.fechaFin,
        })),
      });
    }

    const ancla = await anclaAntesDeLista(lista.clienteId, copia.id, tx);
    await resecuenciar(lista.clienteId, ancla, undefined, tx);
  });

  revalidar();
}

// ── Tareas ────────────────────────────────────────────────────────────────

const TareaSchema = z.object({
  nombre: NombreSchema,
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha de inicio inválida." }),
  duracionDias: z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 999, {
      error: "La duración debe ser un número entero de días hábiles (mínimo 1).",
    }),
  horas: z.string().trim(),
  estado: z
    .string()
    .refine((v) => v in ETIQUETA_ESTADO, { error: "Estado inválido." }),
});

function parseTarea(formData: FormData) {
  // El alta no pide fecha: la tarea se agrega al final de su lista y la
  // secuencia le asigna el arranque. Se usa hoy como provisorio para que el
  // esquema valide; resecuenciar lo pisa enseguida.
  const inicio = String(formData.get("fechaInicio") ?? "") || isoDesdeFecha(hoyUTC());

  const parsed = TareaSchema.safeParse({
    nombre: formData.get("nombre"),
    fechaInicio: inicio,
    // El alta tampoco pide duración: la tarea nace de un día hábil y se
    // redimensiona corriendo su fecha de fin en la tabla.
    duracionDias: formData.get("duracionDias") ?? "1",
    horas: formData.get("horasEstimadas") ?? "0",
    estado: formData.get("estado") ?? "sin_iniciar",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Mismo formato que las horas de Time Tracking: acepta 1,5 o 1:30.
  const horas = parseHorasHsMin(parsed.data.horas || "0");
  if (horas === null || horas < 0) {
    return { error: "Horas estimadas inválidas: cargá 1,5 o el formato 1:30." };
  }

  const fechaInicio = fechaDesdeISO(parsed.data.fechaInicio);
  return {
    datos: {
      nombre: parsed.data.nombre,
      fechaInicio,
      fechaFin: finTrasDiasHabiles(fechaInicio, parsed.data.duracionDias),
      duracionDias: parsed.data.duracionDias,
      horasEstimadas: horas,
      estado: parsed.data.estado as EstadoTareaRoadmap,
    },
  };
}

export async function crearTarea(
  listaId: string,
  _prev: unknown,
  formData: FormData,
): Promise<Resultado> {
  const lista = await listaConAcceso(listaId);
  if (!lista) return { error: "Lista inexistente." };

  const r = parseTarea(formData);
  if (r.error || !r.datos) return { error: r.error };

  await enSecuencia(async (tx) => {
    const ultima = await tx.tareaRoadmap.findFirst({
      where: { ...SOLO_TAREAS_VIVAS, listaId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const tarea = await tx.tareaRoadmap.create({
      data: { listaId, orden: (ultima?.orden ?? -1) + 1, ...r.datos },
    });

    // La tarea nueva se suma al final de su lista y arrastra a las siguientes.
    const ancla = await anclaPrevia(lista.clienteId, tarea.id, tx);
    await resecuenciar(lista.clienteId, ancla, undefined, tx);
  });

  revalidar();
  return {};
}

// Guardado de UN campo, disparado por la edición inline de la tabla. Ninguno
// de estos campos toca la secuencia, así que no hace falta reencadenar.
export async function actualizarCampoTarea(
  tareaId: string,
  campo: CampoTarea,
  valor: string,
): Promise<Resultado> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return { error: "Tarea inexistente." };

  if (campo === "nombre") {
    const parsed = NombreSchema.safeParse(valor);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    await prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { nombre: parsed.data },
    });
    revalidar();
    return {};
  }

  if (campo === "estado") {
    if (!(valor in ETIQUETA_ESTADO)) return { error: "Estado inválido." };
    await prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { estado: valor as EstadoTareaRoadmap },
    });
    revalidar();
    return {};
  }

  if (campo === "personas") {
    // Solo 1 o 2: es una tarea acompañada o no, no un equipo arbitrario.
    const personas = Number(valor);
    if (personas !== 1 && personas !== 2) {
      return { error: "Las personas involucradas deben ser 1 o 2." };
    }
    await prisma.tareaRoadmap.update({ where: { id: tareaId }, data: { personas } });
    revalidar();
    return {};
  }

  if (campo === "horasEstimadas") {
    const horas = parseHorasHsMin(valor || "0");
    if (horas === null || horas < 0) {
      return { error: "Horas inválidas: cargá 1,5 o el formato 1:30." };
    }
    await prisma.tareaRoadmap.update({
      where: { id: tareaId },
      data: { horasEstimadas: horas },
    });
    revalidar();
    return {};
  }

  return { error: "Campo no editable." };
}

// Inicio y Fin de una tarea se guardan JUNTOS: son una sola decisión sobre
// cuándo va la tarea. Separarlos obligaba a dos escrituras, dos recálculos de
// la cadena y un estado intermedio incoherente en el medio —el fin viejo
// conviviendo con el inicio nuevo, que además podía quedar invertido.
//
// La duración se deriva del rango y de ahí en adelante manda ella: es lo que
// la secuencia usa para encadenar.
export async function actualizarRangoTarea(
  tareaId: string,
  inicioISO: string,
  finISO: string,
): Promise<Resultado> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return { error: "Tarea inexistente." };

  const patron = /^\d{4}-\d{2}-\d{2}$/;
  if (!patron.test(inicioISO) || !patron.test(finISO)) {
    return { error: "Fecha inválida." };
  }

  const fechaInicio = fechaDesdeISO(inicioISO);
  const fechaFin = fechaDesdeISO(finISO);
  if (fechaFin < fechaInicio) {
    return { error: "El fin no puede ser anterior al inicio." };
  }
  // El calendario ya deshabilita sábados y domingos, pero la action es una
  // entrada pública: se valida igual.
  if (!esDiaHabil(fechaInicio) || !esDiaHabil(fechaFin)) {
    return { error: "Las tareas solo pueden empezar y terminar en días hábiles." };
  }

  // Mínimo un día hábil: una tarea que empieza y termina el mismo día dura 1.
  const duracionDias = Math.max(1, diasHabilesEntre(fechaInicio, fechaFin));

  await enSecuencia(async (tx) => {
    await tx.tareaRoadmap.update({
      where: { id: tareaId },
      data: {
        fechaInicio,
        duracionDias,
        // Se recalcula en vez de guardar el fin tal cual: la aritmética de
        // días hábiles es la que manda sobre la cadena.
        fechaFin: finTrasDiasHabiles(fechaInicio, duracionDias),
      },
    });

    // Ancla en esta tarea: lo anterior queda quieto, lo posterior se
    // reencadena.
    await resecuenciar(tarea.lista.clienteId, tareaId, undefined, tx);
  });

  revalidar();
  return {};
}

// ── Reordenar ─────────────────────────────────────────────────────────────

// Después de mover algo, las fechas de lo que sigue cambian: el plan es
// secuencial y el orden ES la dependencia. Se reencadena desde el primer
// lugar donde la secuencia difiere de como estaba, así todo lo anterior al
// movimiento conserva las fechas que alguien puso a mano.
async function reencadenarTrasMover(
  clienteId: string,
  antes: string[],
  tx: DB,
): Promise<void> {
  const despues = (await getTareasEnOrden(clienteId, tx)).map((t) => t.id);
  let i = 0;
  while (i < antes.length && i < despues.length && antes[i] === despues[i]) i++;
  // i === 0 significa que se movió la primera tarea del plan: no hay ancla y
  // se replanifica desde el arranque del proyecto.
  await resecuenciar(clienteId, i > 0 ? despues[i - 1] : undefined, undefined, tx);
}

// Nuevo orden de las listas del proyecto. Recibe la lista completa de ids en
// el orden final —no un "moví esto acá"— porque así el servidor no tiene que
// reconstruir la intención y el resultado es el mismo que se vio en pantalla.
export async function reordenarListas(
  clienteId: string,
  idsEnOrden: string[],
): Promise<void> {
  await requireAcceso(clienteId);
  if (idsEnOrden.length === 0) return;

  await enSecuencia(async (tx) => {
    const actuales = await tx.listaRoadmap.findMany({
      where: listasVivas({ clienteId }),
      select: { id: true },
    });
    const validos = new Set(actuales.map((l) => l.id));
    // Se ignoran ids ajenos o ya eliminados: la acción es una entrada pública.
    const orden = idsEnOrden.filter((id) => validos.has(id));
    if (orden.length !== actuales.length) return;

    const antes = (await getTareasEnOrden(clienteId, tx)).map((t) => t.id);

    for (const [i, id] of orden.entries()) {
      await tx.listaRoadmap.update({ where: { id }, data: { orden: i } });
    }

    await reencadenarTrasMover(clienteId, antes, tx);
  });

  revalidar();
}

// Nuevo orden de las tareas DENTRO de una lista. Mover una tarea de lista es
// otra cosa y no se hace por acá.
export async function reordenarTareas(
  listaId: string,
  idsEnOrden: string[],
): Promise<void> {
  const lista = await listaConAcceso(listaId);
  if (!lista || idsEnOrden.length === 0) return;

  await enSecuencia(async (tx) => {
    const actuales = await tx.tareaRoadmap.findMany({
      where: { ...SOLO_TAREAS_VIVAS, listaId },
      select: { id: true },
    });
    const validos = new Set(actuales.map((t) => t.id));
    const orden = idsEnOrden.filter((id) => validos.has(id));
    if (orden.length !== actuales.length) return;

    const antes = (await getTareasEnOrden(lista.clienteId, tx)).map((t) => t.id);

    for (const [i, id] of orden.entries()) {
      await tx.tareaRoadmap.update({ where: { id }, data: { orden: i } });
    }

    await reencadenarTrasMover(lista.clienteId, antes, tx);
  });

  revalidar();
}

// ── Acciones masivas ──────────────────────────────────────────────────────

// Valida el acceso a todos los proyectos tocados y devuelve las tareas.
async function tareasConAcceso(ids: string[]) {
  const tareas = await prisma.tareaRoadmap.findMany({
    where: { ...tareasVivas(), id: { in: ids } },
    include: { lista: { select: { clienteId: true } } },
  });
  const clientes = [...new Set(tareas.map((t) => t.lista.clienteId))];
  let actor = null as Awaited<ReturnType<typeof requireAcceso>>["usuario"] | null;
  for (const clienteId of clientes) actor = (await requireAcceso(clienteId)).usuario;
  return { tareas, clientes, actor };
}

// Solo se aplican en masa los campos que tienen sentido uniformes. Las fechas
// y el nombre quedan afuera a propósito: son propios de cada tarea y las
// fechas se derivan de la secuencia.
export async function editarTareas(
  ids: string[],
  campo: "estado" | "horasEstimadas",
  valor: string,
): Promise<{ error?: string; actualizadas?: number }> {
  if (ids.length === 0) return { actualizadas: 0 };
  const { tareas } = await tareasConAcceso(ids);
  if (tareas.length === 0) return { actualizadas: 0 };

  if (campo === "estado") {
    if (!(valor in ETIQUETA_ESTADO)) return { error: "Estado inválido." };
    await prisma.tareaRoadmap.updateMany({
      where: { id: { in: tareas.map((t) => t.id) } },
      data: { estado: valor as EstadoTareaRoadmap },
    });
  } else {
    const horas = parseHorasHsMin(valor || "0");
    if (horas === null || horas < 0) {
      return { error: "Horas inválidas: cargá 1,5 o el formato 1:30." };
    }
    await prisma.tareaRoadmap.updateMany({
      where: { id: { in: tareas.map((t) => t.id) } },
      data: { horasEstimadas: horas },
    });
  }

  // Ninguno de los dos campos toca fechas: no hace falta reencadenar.
  revalidar();
  return { actualizadas: tareas.length };
}

export async function eliminarTareas(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { tareas, clientes, actor } = await tareasConAcceso(ids);
  if (tareas.length === 0 || !actor) return;

  const idsValidos = tareas.map((t) => t.id);
  const aBorrar = new Set(idsValidos);

  await enSecuencia(async (tx) => {
    // Las anclas se resuelven ANTES de borrar: es la tarea anterior a la
    // primera eliminada de cada proyecto, y por definición no está en el lote.
    const anclas = new Map<string, string | undefined>();
    for (const clienteId of clientes) {
      const orden = await getTareasEnOrden(clienteId, tx);
      const i = orden.findIndex((t) => aBorrar.has(t.id));
      anclas.set(clienteId, i > 0 ? orden[i - 1].id : undefined);
    }

    // A la papelera: se pueden restaurar una por una desde ahí.
    await tx.tareaRoadmap.updateMany({
      where: { id: { in: idsValidos } },
      data: { eliminadoEn: new Date(), eliminadoPorId: actor.id },
    });

    for (const clienteId of clientes) {
      await resecuenciar(clienteId, anclas.get(clienteId), undefined, tx);
    }
  });

  revalidar();
}

export async function eliminarTarea(tareaId: string): Promise<void> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return;
  const clienteId = tarea.lista.clienteId;

  await enSecuencia(async (tx) => {
    // El ancla se calcula ANTES de borrar: después, la tarea ya no está en la
    // secuencia y no se podría ubicar su anterior.
    const ancla = await anclaPrevia(clienteId, tareaId, tx);

    // A la papelera, no al vacío. Las horas cargadas no se tocan: su dato
    // vivo es cliente + concepto.
    await tx.tareaRoadmap.update({
      where: { id: tareaId },
      data: { eliminadoEn: new Date(), eliminadoPorId: tarea.actor.id },
    });

    await resecuenciar(clienteId, ancla, undefined, tx);
  });

  revalidar();
}
