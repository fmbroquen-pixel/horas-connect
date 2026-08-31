"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { enCursoQueEstorba, esCierreValido } from "@/lib/secuencia-tareas";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { parseHorasHsMin } from "@/lib/horas";
import {
  diasHabilesEntre,
  esDiaHabil,
  fechaDesdeISO,
  finTrasDiasHabiles,
  hoyUTC,
  isoDesdeFecha,
  siguienteDiaHabil,
} from "@/lib/dias-habiles";
import {
  PLANTILLAS,
  escriturasDeSecuencia,
  getTareasEnOrden,
  planificar,
  resecuenciar,
  type DB,
} from "@/lib/roadmap";
import { SOLO_TAREAS_VIVAS, listasVivas, tareasVivas } from "@/lib/roadmap-papelera";
import { ETIQUETA_ESTADO } from "./constantes";
import type { EstadoTareaRoadmap } from "@/generated/prisma/client";

type Resultado = { error?: string };

// El intento de poner una tarea "En curso" cuando ya hay otra. No es un error:
// es una decisión que le falta al usuario, así que en vez de rechazar se le
// devuelve quién estorba para que resuelva las dos cosas juntas.
export type ConflictoEnCurso = { id: string; nombre: string };
type ResultadoEstado = Resultado & { conflicto?: ConflictoEnCurso };

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

// Un proyecto inactivo no acepta escrituras. El chequeo va acá y no en cada
// accion porque TODO lo que se escribe de un proyecto pasa por esta puerta
// -semaforo, etapa, tablero, listas, tareas-, y ponerlo en cada una seria
// diez lugares donde olvidarse en la proxima.
//
// Un semaforo o una etapa no se sienten "carga de datos" como una hora, pero
// son exactamente eso: filas nuevas, con fecha y autor, sobre un cliente que
// dejo de operar.
async function requireAcceso(clienteId: string) {
  const acceso = await getAccesoProyecto(clienteId);
  if (!acceso) throw new Error("No autorizado.");
  if (!acceso.cliente.activo) {
    throw new Error(
      `"${acceso.cliente.nombre}" está inactivo: no admite cambios.`,
    );
  }
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
  // Solo para el estado: con qué cerrar la tarea que venía en curso. Sin esto,
  // un choque devuelve el conflicto en lugar de escribir.
  cierreDeLaAnterior?: string,
): Promise<ResultadoEstado> {
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

    // Una sola en curso por lista. La regla se valida acá y no solo en la UI:
    // el popup se puede saltear, y dos tareas en curso dejan a la lista
    // describiendo un avance que no existe.
    if (valor === "en_curso") {
      const hermanas = await prisma.tareaRoadmap.findMany({
        where: { ...SOLO_TAREAS_VIVAS, listaId: tarea.listaId },
        select: { id: true, nombre: true, estado: true },
      });
      const estorba = enCursoQueEstorba(hermanas, tareaId);

      if (estorba) {
        if (!cierreDeLaAnterior) return { conflicto: estorba };
        if (!esCierreValido(cierreDeLaAnterior)) {
          return { error: "Estado inválido para la tarea anterior." };
        }
        // Las dos escrituras en una transacción: si la segunda fallara, la
        // lista quedaría sin ninguna en curso o con dos, que son justo los dos
        // estados que esto viene a evitar.
        await prisma.$transaction([
          prisma.tareaRoadmap.update({
            where: { id: estorba.id },
            data: { estado: cierreDeLaAnterior as EstadoTareaRoadmap },
          }),
          prisma.tareaRoadmap.update({
            where: { id: tareaId },
            data: { estado: "en_curso" },
          }),
        ]);
        revalidar();
        return {};
      }
    }

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
): Promise<Resultado & Reprogramacion> {
  const tarea = await tareaConAcceso(tareaId);
  if (!tarea) return { error: "Tarea inexistente.", recalculadas: [] };

  const patron = /^\d{4}-\d{2}-\d{2}$/;
  if (!patron.test(inicioISO) || !patron.test(finISO)) {
    return { error: "Fecha inválida.", recalculadas: [] };
  }

  const fechaInicio = fechaDesdeISO(inicioISO);
  const fechaFin = fechaDesdeISO(finISO);
  if (fechaFin < fechaInicio) {
    return { error: "El fin no puede ser anterior al inicio.", recalculadas: [] };
  }
  // El calendario ya deshabilita sábados y domingos, pero la action es una
  // entrada pública: se valida igual.
  if (!esDiaHabil(fechaInicio) || !esDiaHabil(fechaFin)) {
    return {
      error: "Las tareas solo pueden empezar y terminar en días hábiles.",
      recalculadas: [],
    };
  }

  // Mínimo un día hábil: una tarea que empieza y termina el mismo día dura 1.
  const duracionDias = Math.max(1, diasHabilesEntre(fechaInicio, fechaFin));
  // El fin se recalcula en vez de guardarse tal cual: la aritmética de días
  // hábiles es la que manda sobre la cadena.
  const finReal = finTrasDiasHabiles(fechaInicio, duracionDias);

  // Si las fechas quedan iguales a las que ya tenía, esta tarea no entra en la
  // cuenta: el toast diría "1 tarea" sin que nada se haya movido.
  const cambioLaEditada =
    tarea.fechaInicio.getTime() !== fechaInicio.getTime() ||
    tarea.fechaFin.getTime() !== finReal.getTime();

  const dependientes = await enSecuencia(async (tx) => {
    await tx.tareaRoadmap.update({
      where: { id: tareaId },
      data: { fechaInicio, duracionDias, fechaFin: finReal },
    });

    // Ancla en esta tarea: lo anterior queda quieto, lo posterior se
    // reencadena. El ancla nunca vuelve entre las cambiadas —ya quedó con sus
    // fechas nuevas y compara igual—, así que se suma aparte.
    return resecuenciar(tarea.lista.clienteId, tareaId, undefined, tx);
  });

  revalidar();
  return {
    recalculadas: [...(cambioLaEditada ? [tareaId] : []), ...dependientes],
  };
}

// ── Reordenar ─────────────────────────────────────────────────────────────

// Reencadena sobre un orden que TODAVÍA no está en la base. calcularSecuencia
// lee el plan tal como está guardado, así que acá se le arma el plan nuevo a
// mano: mismas tareas, en el orden que eligió la persona.
async function calcularSecuenciaConOrden(
  clienteId: string,
  idsEnOrden: string[],
  anclaId: string | undefined,
): Promise<{ id: string; fechaInicio: Date; fechaFin: Date }[]> {
  const tareas = await getTareasEnOrden(clienteId);
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const plan = idsEnOrden.map((id) => porId.get(id)!).filter(Boolean);
  if (plan.length === 0) return [];

  const indice = anclaId ? plan.findIndex((t) => t.id === anclaId) : -1;
  const desde = indice >= 0 ? indice : 0;
  const inicio =
    indice >= 0 ? plan[desde].fechaInicio : await inicioDelPlan(clienteId);

  const fechas = planificar(plan, desde, inicio);
  return fechas.flatMap(({ fechaInicio, fechaFin }, i) => {
    const t = plan[desde + i];
    const igual =
      t.fechaInicio.getTime() === fechaInicio.getTime() &&
      t.fechaFin.getTime() === fechaFin.getTime();
    return igual ? [] : [{ id: t.id, fechaInicio, fechaFin }];
  });
}

// Arranque del plan cuando no hay ancla: la fecha de inicio del contrato o el
// próximo día hábil.
async function inicioDelPlan(clienteId: string): Promise<Date> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { fechaInicio: true },
  });
  return siguienteDiaHabil(cliente?.fechaInicio ?? hoyUTC());
}

// Después de mover algo, las fechas de lo que sigue cambian: el plan es
// secuencial y el orden ES la dependencia. Se reencadena desde el primer
// lugar donde la secuencia difiere de como estaba, así todo lo anterior al
// movimiento conserva las fechas que alguien puso a mano.
//
// El ancla se calcula sobre el orden NUEVO, que todavía no está escrito: se
// simula en memoria a partir de los ids que mandó el cliente. Así todo el
// trabajo de decisión ocurre antes de tocar la base, y las escrituras salen
// juntas en un solo viaje.
function anclaDelCambio(antes: string[], despues: string[]): string | undefined {
  let i = 0;
  while (i < antes.length && i < despues.length && antes[i] === despues[i]) i++;
  // i === 0 significa que se movió la primera tarea del plan: no hay ancla y
  // se replanifica desde el arranque del proyecto.
  return i > 0 ? despues[i - 1] : undefined;
}

// Nuevo orden de las listas del proyecto. Recibe la lista completa de ids en
// el orden final —no un "moví esto acá"— porque así el servidor no tiene que
// reconstruir la intención y el resultado es el mismo que se vio en pantalla.
// Devuelve los ids de las tareas cuyas fechas cambiaron: la pantalla las
// resalta un momento y avisa cuántas fueron. Sin ese dato, reprogramar veinte
// tareas de golpe se ve igual que no hacer nada.
export type Reprogramacion = { recalculadas: string[] };

export async function reordenarListas(
  clienteId: string,
  idsEnOrden: string[],
): Promise<Reprogramacion> {
  await requireAcceso(clienteId);
  if (idsEnOrden.length === 0) return { recalculadas: [] };

  const listas = await prisma.listaRoadmap.findMany({
    where: listasVivas({ clienteId }),
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: {
      tareas: {
        where: SOLO_TAREAS_VIVAS,
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      },
    },
  });
  const validos = new Set(listas.map((l) => l.id));
  // Se ignoran ids ajenos o ya eliminados: la acción es una entrada pública.
  const orden = idsEnOrden.filter((id) => validos.has(id));
  if (orden.length !== listas.length) return { recalculadas: [] };

  const antes = listas.flatMap((l) => l.tareas.map((t) => t.id));
  const despues = orden.flatMap(
    (id) => listas.find((l) => l.id === id)!.tareas.map((t) => t.id),
  );
  const ancla = anclaDelCambio(antes, despues);
  if (antes.join() === despues.join() && orden.join() === listas.map((l) => l.id).join()) {
    return { recalculadas: [] };
  }

  // Las fechas se calculan sobre el orden nuevo simulado en memoria, no
  // releyendo la base entre escritura y escritura.
  const cambios = await calcularSecuenciaConOrden(clienteId, despues, ancla);

  // Un solo viaje: los órdenes de las listas y todas las fechas juntas.
  await prisma.$transaction([
    ...orden.map((id, i) =>
      prisma.listaRoadmap.update({ where: { id }, data: { orden: i } }),
    ),
    ...escriturasDeSecuencia(cambios),
  ]);

  revalidar();
  return { recalculadas: cambios.map((c) => c.id) };
}

// Nuevo orden de las tareas DENTRO de una lista. Mover una tarea de lista es
// otra cosa y no se hace por acá.
export async function reordenarTareas(
  listaId: string,
  idsEnOrden: string[],
): Promise<Reprogramacion> {
  const lista = await listaConAcceso(listaId);
  if (!lista || idsEnOrden.length === 0) return { recalculadas: [] };

  const antesTodo = (await getTareasEnOrden(lista.clienteId)).map((t) => t.id);
  const deLaLista = await prisma.tareaRoadmap.findMany({
    where: { ...SOLO_TAREAS_VIVAS, listaId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const validos = new Set(deLaLista.map((t) => t.id));
  const orden = idsEnOrden.filter((id) => validos.has(id));
  if (orden.length !== deLaLista.length) return { recalculadas: [] };
  if (orden.join() === deLaLista.map((t) => t.id).join()) {
    return { recalculadas: [] };
  }

  // La secuencia nueva del proyecto: el mismo plan de antes, con el tramo de
  // esta lista reemplazado por el orden elegido.
  const enLista = new Set(orden);
  let k = 0;
  const despues = antesTodo.map((id) => (enLista.has(id) ? orden[k++] : id));

  const ancla = anclaDelCambio(antesTodo, despues);
  const cambios = await calcularSecuenciaConOrden(lista.clienteId, despues, ancla);

  await prisma.$transaction([
    ...orden.map((id, i) =>
      prisma.tareaRoadmap.update({ where: { id }, data: { orden: i } }),
    ),
    ...escriturasDeSecuencia(cambios),
  ]);

  revalidar();
  return { recalculadas: cambios.map((c) => c.id) };
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

    // En masa no se ofrece resolver el conflicto: marcar varias como "En
    // curso" no tiene una respuesta obvia -cuál de todas queda- y en la misma
    // lista es directamente imposible. Se frena con un mensaje y se hace de a
    // una, que es donde el popup sí puede preguntar.
    if (valor === "en_curso") {
      const porLista = new Map<string, number>();
      for (const t of tareas) {
        porLista.set(t.listaId, (porLista.get(t.listaId) ?? 0) + 1);
      }
      if ([...porLista.values()].some((n) => n > 1)) {
        return {
          error: "Solo puede haber una tarea En curso por lista: marcalas de a una.",
        };
      }
      for (const t of tareas) {
        const hermanas = await prisma.tareaRoadmap.findMany({
          where: { ...SOLO_TAREAS_VIVAS, listaId: t.listaId },
          select: { id: true, nombre: true, estado: true },
        });
        const estorba = enCursoQueEstorba(hermanas, t.id);
        if (estorba) {
          return {
            error: `"${estorba.nombre}" ya está En curso en esa lista. Cambiala primero o marcá de a una.`,
          };
        }
      }
    }

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
