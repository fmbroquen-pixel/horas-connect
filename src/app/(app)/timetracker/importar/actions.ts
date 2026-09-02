"use server";

import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { normalizarNombre as normalizar } from "@/lib/normalizar-nombre";
import { tarifaVigenteA, type TarifaVigencia } from "@/lib/tarifas";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import { getUsuariosQueReportan } from "@/lib/registrar-para";
import { getUsuariosVisibles } from "@/lib/usuarios-tt";
import {
  claveDuplicado,
  esError,
  resolverClienteDeFila,
  resolverDuenio,
} from "@/lib/importar-fila";
import type { Usuario } from "@/generated/prisma/client";
import { getConceptosActivos } from "@/lib/conceptos";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { parseHorasHsMin } from "@/lib/horas";
import { fechaDesdeISO, hoyUTC } from "@/lib/dias-habiles";
import type { Modalidad, Ownership } from "@/generated/prisma/client";

// Columnas editables de la tabla (USD/Hora y USD Total se calculan solos y
// se excluyen de la importación).
const COLUMNAS_REQUERIDAS = [
  "fecha",
  // Obligatoria desde que un mismo archivo puede traer varios mentores. Antes
  // el dueño lo fijaba un selector fuera del archivo, así que importar el
  // historial de cinco personas eran cinco importaciones.
  "usuario",
  "cliente",
  "concepto",
  "ownership",
  "horas",
  "modalidad",
];
// "Etapa" se ignora en vez de rechazarse: los archivos exportados antes del
// Roadmap la traen, y así no cortan la importación por una columna de más.
const COLUMNAS_IGNORADAS = ["usd/hora", "usd total", "usd/h", "usd", "total", "etapa"];
// Alias aceptados: cabeceras de plantillas anteriores. "Proyecto" era el
// nombre viejo de Cliente, y "Tarea" el de Concepto.
const ALIAS_COLUMNAS: Record<string, string> = {
  proyecto: "cliente",
  tarea: "concepto",
  mentor: "usuario",
};

export type FilaPreview = {
  fila: number;
  fecha: string;
  usuario: string;
  proyecto: string;
  concepto: string;
  ownership: string;
  horas: string;
  modalidad: string;
  errores: string[];
};

export type Preview = {
  error?: string;
  columnasFaltantes: string[];
  columnasDesconocidas: string[];
  filas: FilaPreview[];
  validas: number;
  conError: number;
};

function parseFecha(raw: unknown): string | null {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, a] = dmy;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// Lee CSV o XLSX y devuelve { headers, filas: string[][] }.
async function leerArchivo(
  archivo: File,
): Promise<{ headers: string[]; filas: unknown[][] } | null> {
  const nombre = archivo.name.toLowerCase();
  const buffer = Buffer.from(await archivo.arrayBuffer());

  if (nombre.endsWith(".csv")) {
    const texto = buffer.toString("utf-8").replace(/^﻿/, "");
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lineas.length === 0) return null;
    const parseLinea = (l: string) => {
      const out: string[] = [];
      let cur = "";
      let enComillas = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (enComillas) {
          if (c === '"' && l[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (c === '"') enComillas = false;
          else cur += c;
        } else if (c === '"') enComillas = true;
        else if (c === ",") {
          out.push(cur);
          cur = "";
        } else cur += c;
      }
      out.push(cur);
      return out;
    };
    const headers = parseLinea(lineas[0]);
    const filas = lineas.slice(1).map(parseLinea);
    return { headers, filas };
  }

  // XLSX
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return null;
  const headers: string[] = [];
  const filas: unknown[][] = [];
  ws.eachRow((row, idx) => {
    const valores = (row.values as unknown[]).slice(1); // exceljs indexa desde 1
    if (idx === 1) {
      valores.forEach((v) => headers.push(String(v ?? "")));
    } else {
      filas.push(valores);
    }
  });
  return { headers, filas };
}

async function procesar(actor: Usuario, archivo: File) {
  const leido = await leerArchivo(archivo);
  if (!leido) return null;

  const headersNorm = leido.headers
    .map(normalizar)
    .map((h) => ALIAS_COLUMNAS[h] ?? h);
  const columnasFaltantes = COLUMNAS_REQUERIDAS.filter(
    (c) => !headersNorm.includes(c),
  );
  const columnasDesconocidas = headersNorm.filter(
    (h) => h && !COLUMNAS_REQUERIDAS.includes(h) && !COLUMNAS_IGNORADAS.includes(h),
  );

  const idx = (col: string) => headersNorm.indexOf(col);

  // La MISMA fuente que usa la carga manual de Time Tracking: el importador no
  // puede tener su propia idea de a qué clientes se puede cargar.
  // ── Índices por usuario ──────────────────────────────────────────────────
  // Todo lo que antes se resolvía una vez para el único destino ahora se
  // resuelve por mentor: sus clientes y sus tarifas. Un archivo con cinco
  // personas se valida con las reglas de cada una, no con las de quien importa.

  // Quiénes pueden ser dueños de una fila de este archivo.
  const visibles = await getUsuariosVisibles(actor);
  const visiblePorNombre = new Map(visibles.map((u) => [normalizar(u.nombre), u]));
  // Y el padrón completo, para distinguir "ese usuario no existe" de "existe
  // pero no podés cargarle horas". Son dos problemas distintos: uno se arregla
  // corrigiendo el archivo y el otro pidiendo permisos.
  const todosLosUsuarios = new Map(
    (await getUsuariosQueReportan()).map((u) => [normalizar(u.nombre), u]),
  );

  const carteras = new Map<string, Map<string, { id: string; nombre: string }>>();
  for (const u of visibles) {
    const suyos = await getProyectosPermitidos(u.id);
    carteras.set(u.id, new Map(suyos.map((p) => [normalizar(p.nombre), p])));
  }

  // Todas las tarifas, no solo las vigentes: una importación trae historia y
  // cada fila tiene que valuarse con la tarifa que regía EN SU FECHA. Con solo
  // las vigentes, importar seis meses aplicaba la tarifa de hoy a todo.
  const tarifasPorUsuario = new Map<string, Map<string, TarifaVigencia[]>>();
  for (const t of await prisma.tarifa.findMany({
    where: { usuarioId: { in: visibles.map((u) => u.id) } },
  })) {
    const porCombo = tarifasPorUsuario.get(t.usuarioId) ?? new Map();
    const k = `${t.modalidad}-${t.ownership}`;
    porCombo.set(k, [
      ...(porCombo.get(k) ?? []),
      {
        valorUsd: Number(t.valorUsd),
        vigenteDesde: t.vigenteDesde,
        vigenteHasta: t.vigenteHasta,
      },
    ]);
    tarifasPorUsuario.set(t.usuarioId, porCombo);
  }

  // El catálogo completo de clientes. Sin esto no se puede distinguir "ese
  // cliente no existe" de "existe pero no es de esa persona", y las dos cosas
  // salían con el mismo texto: "Cliente inexistente o no asignado". Ese mensaje
  // mandaba a revisar la ortografía de un nombre que estaba perfecto.
  const todos = new Map(
    (
      await prisma.cliente.findMany({
        select: { nombre: true, activo: true },
      })
    ).map((c) => [normalizar(c.nombre), c]),
  );

  // El catálogo de conceptos es global, así que basta un índice por nombre.
  const conceptos = await getConceptosActivos();
  const conceptoPorNombre = new Map<string, string>(
    conceptos.map((c) => [normalizar(c.nombre), c.id]),
  );

  // En UTC, igual que la carga manual y que la columna @db.Date.
  const hoy = hoyUTC();

  // Para detectar duplicados contra la base.
  //
  // La clave incluye al dueño: dos mentores pueden haber hecho lo mismo el
  // mismo día para el mismo cliente, y eso son dos registros distintos, no uno
  // repetido. Sin el usuario en la clave, la segunda fila del archivo se
  // habría descartado en silencio.
  const existentes = await prisma.registroHoras.findMany({
    where: { usuarioId: { in: visibles.map((u) => u.id) }, ...SOLO_ACTIVOS },
    select: {
      usuarioId: true,
      fecha: true,
      clienteId: true,
      conceptoId: true,
      ownership: true,
      modalidad: true,
      horas: true,
    },
  });
  const claveExistente = new Set(
    existentes.map((r) =>
      claveDuplicado({
        usuarioId: r.usuarioId,
        fechaISO: r.fecha.toISOString().slice(0, 10),
        clienteId: r.clienteId,
        conceptoId: r.conceptoId ?? "",
        ownership: r.ownership,
        modalidad: r.modalidad,
        horas: Number(r.horas),
      }),
    ),
  );
  const clavesEnLote = new Set<string>();

  const filas: FilaPreview[] = [];
  const validas: {
    usuarioId: string;
    fecha: Date;
    clienteId: string;
    conceptoId: string;
    ownership: Ownership;
    modalidad: Modalidad;
    horas: number;
    tarifa: number;
  }[] = [];

  if (columnasFaltantes.length > 0) {
    return { columnasFaltantes, columnasDesconocidas, filas, validas };
  }

  leido.filas.forEach((cols, i) => {
    const val = (col: string) => String(cols[idx(col)] ?? "").trim();
    const rawFecha = cols[idx("fecha")];
    const fechaStr = val("fecha");
    const usuarioTexto = val("usuario");
    const proyecto = val("cliente");
    const conceptoTexto = val("concepto");
    const ownershipRaw = normalizar(val("ownership"));
    const horasStr = val("horas");
    const modalidadRaw = normalizar(val("modalidad"));

    const errores: string[] = [];

    const fechaISO = parseFecha(rawFecha);
    if (!fechaISO) errores.push("Fecha inválida");
    else if (fechaDesdeISO(fechaISO) > hoy) errores.push("Fecha futura");

    // ── Dueño de la fila ─────────────────────────────────────────────────
    // Se resuelve primero porque de él dependen las dos validaciones que
    // siguen: qué clientes son suyos y con qué tarifa se valúa la hora.
    // Después de esto se trabaja por id; el nombre solo sirvió para encontrarlo.
    const resDuenio = resolverDuenio(
      usuarioTexto,
      normalizar(usuarioTexto),
      visiblePorNombre,
      todosLosUsuarios,
    );
    const duenio = esError(resDuenio) ? undefined : resDuenio.valor;
    if (esError(resDuenio)) errores.push(resDuenio.error);

    // Una vez resuelto, se trabaja por id: `proy.id` es lo que se guarda y lo
    // que arma la clave de duplicados. El nombre solo sirve para encontrarlo.
    //
    // Sin dueño no se puede decir nada del cliente: "no está asignado" necesita
    // saber a quién. Se calla y se arregla primero el usuario.
    let proy: { id: string; nombre: string } | undefined;
    if (duenio) {
      const resCliente = resolverClienteDeFila(
        proyecto,
        normalizar(proyecto),
        duenio,
        // La cartera del DUEÑO de la fila, no la de quien importa: un admin
        // puede traer horas de un cliente que él no tiene asignado y el mentor sí.
        carteras.get(duenio.id) ?? new Map(),
        todos,
      );
      if (esError(resCliente)) errores.push(resCliente.error);
      else proy = resCliente.valor;
    } else if (!proyecto) {
      errores.push("Falta el cliente");
    }

    const conceptoId = conceptoPorNombre.get(normalizar(conceptoTexto));
    if (!conceptoTexto) errores.push("Falta el concepto");
    else if (!conceptoId) errores.push("Concepto inexistente o dado de baja");

    const ownership: Ownership | null =
      ownershipRaw === "owner" || ownershipRaw === "titular"
        ? "owner"
        : ownershipRaw === "backup" || ownershipRaw === "acompañante" || ownershipRaw === "acompanante"
          ? "backup"
          : null;
    if (!ownership) errores.push("Ownership inválido (Owner/Backup)");

    const modalidad: Modalidad | null =
      modalidadRaw === "presencial"
        ? "presencial"
        : modalidadRaw === "virtual"
          ? "virtual"
          : null;
    if (!modalidad) errores.push("Modalidad inválida (Presencial/Virtual)");

    const horas = parseHorasHsMin(horasStr);
    if (horas === null || horas <= 0 || horas > 24) errores.push("Horas inválidas");

    let tarifa: number | undefined;
    if (duenio && ownership && modalidad && fechaISO) {
      const aplicable = tarifaVigenteA(
        tarifasPorUsuario.get(duenio.id)?.get(`${modalidad}-${ownership}`) ?? [],
        fechaDesdeISO(fechaISO),
      );
      tarifa = aplicable ?? undefined;
      if (tarifa === undefined) {
        errores.push(`${duenio.nombre} no tiene tarifa para esa combinación`);
      }
    }

    // Duplicados (contra la base y dentro del mismo archivo).
    if (errores.length === 0 && duenio && fechaISO && proy && conceptoId && ownership && modalidad && horas !== null) {
      const clave = claveDuplicado({
        usuarioId: duenio.id,
        fechaISO,
        clienteId: proy.id,
        conceptoId,
        ownership,
        modalidad,
        horas,
      });
      if (claveExistente.has(clave)) errores.push("Registro duplicado (ya existe)");
      else if (clavesEnLote.has(clave)) errores.push("Duplicado dentro del archivo");
      else clavesEnLote.add(clave);
    }

    filas.push({
      fila: i + 2, // +1 header, +1 base 1
      fecha: fechaStr,
      usuario: usuarioTexto,
      proyecto,
      concepto: conceptoTexto,
      ownership: val("ownership"),
      horas: horasStr,
      modalidad: val("modalidad"),
      errores,
    });

    if (errores.length === 0 && duenio && fechaISO && proy && conceptoId && ownership && modalidad && horas !== null && tarifa !== undefined) {
      validas.push({
        usuarioId: duenio.id,
        fecha: fechaDesdeISO(fechaISO),
        clienteId: proy.id,
        conceptoId,
        ownership,
        modalidad,
        horas,
        tarifa,
      });
    }
  });

  return { columnasFaltantes, columnasDesconocidas, filas, validas };
}

export async function analizarImportacion(
  _prev: unknown,
  formData: FormData,
): Promise<Preview> {
  const actor = await requireGuest();
  // Ya no hay un destino único: cada fila trae el suyo y se valida con sus
  // reglas. Lo que se pasa es quién importa, para saber a quiénes puede
  // cargarle horas.
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo.", columnasFaltantes: [], columnasDesconocidas: [], filas: [], validas: 0, conError: 0 };
  }
  const r = await procesar(actor, archivo);
  if (!r) {
    return { error: "No se pudo leer el archivo.", columnasFaltantes: [], columnasDesconocidas: [], filas: [], validas: 0, conError: 0 };
  }
  const conError = r.filas.filter((f) => f.errores.length > 0).length;
  return {
    columnasFaltantes: r.columnasFaltantes,
    columnasDesconocidas: r.columnasDesconocidas,
    filas: r.filas,
    validas: r.validas.length,
    conError,
  };
}

export async function confirmarImportacion(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; importadas?: number; omitidas?: number }> {
  const { revalidatePath } = await import("next/cache");
  const actor = await requireGuest();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo." };
  }
  const r = await procesar(actor, archivo);
  if (!r) return { error: "No se pudo leer el archivo." };
  if (r.columnasFaltantes.length > 0) {
    return { error: `Faltan columnas: ${r.columnasFaltantes.join(", ")}` };
  }
  if (r.validas.length === 0) {
    return { error: "No hay registros válidos para importar." };
  }

  await prisma.registroHoras.createMany({
    data: r.validas.map((v) => ({
      fecha: v.fecha,
      clienteId: v.clienteId,
      conceptoId: v.conceptoId,
      // worked_by: el de LA FILA, no un destino global. Es todo el cambio.
      usuarioId: v.usuarioId,
      horas: v.horas,
      modalidad: v.modalidad,
      ownership: v.ownership,
      tarifaUsdAplicada: v.tarifa,
      montoUsd: Math.round(v.horas * v.tarifa * 100) / 100,
      creadoPorId: actor.id, // reported_by
    })),
  });

  revalidatePath("/timetracker");
  revalidatePath("/dashboard");
  revalidatePath("/proyectos", "layout");
  const omitidas = r.filas.length - r.validas.length;
  return { importadas: r.validas.length, omitidas };
}
