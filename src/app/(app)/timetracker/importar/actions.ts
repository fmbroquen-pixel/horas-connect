"use server";

import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireGuest, getProyectosPermitidos } from "@/lib/require-guest";
import { parseHorasHsMin } from "@/lib/horas";
import type { Modalidad, Ownership } from "@/generated/prisma/client";

// Columnas editables de la tabla (USD/Hora y USD Total se calculan solos y
// se excluyen de la importación).
const COLUMNAS_REQUERIDAS = [
  "fecha",
  "proyecto",
  "etapa",
  "ownership",
  "horas",
  "modalidad",
];
const COLUMNAS_IGNORADAS = ["usd/hora", "usd total", "usd/h", "usd", "total"];

export type FilaPreview = {
  fila: number;
  fecha: string;
  proyecto: string;
  etapa: string;
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

function normalizar(s: string) {
  return s.trim().toLowerCase();
}

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

async function procesar(usuarioId: string, archivo: File) {
  const leido = await leerArchivo(archivo);
  if (!leido) return null;

  const headersNorm = leido.headers.map(normalizar);
  const columnasFaltantes = COLUMNAS_REQUERIDAS.filter(
    (c) => !headersNorm.includes(c),
  );
  const columnasDesconocidas = headersNorm.filter(
    (h) => h && !COLUMNAS_REQUERIDAS.includes(h) && !COLUMNAS_IGNORADAS.includes(h),
  );

  const idx = (col: string) => headersNorm.indexOf(col);

  const proyectos = await getProyectosPermitidos(usuarioId);
  const etapas = await prisma.etapa.findMany({ where: { activo: true } });
  const tarifas = await prisma.tarifa.findMany({
    where: { usuarioId, vigenteHasta: null },
  });
  const tarifaMap = new Map<string, number>();
  for (const t of tarifas) tarifaMap.set(`${t.modalidad}-${t.ownership}`, Number(t.valorUsd));

  const proyPorNombre = new Map(proyectos.map((p) => [normalizar(p.nombre), p]));
  const etapaPorNombre = new Map(etapas.map((e) => [normalizar(e.etiqueta), e]));

  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  // Para detectar duplicados contra la base.
  const existentes = await prisma.registroHoras.findMany({
    where: { usuarioId, eliminadoEn: null },
    select: {
      fecha: true,
      clienteId: true,
      etapaId: true,
      ownership: true,
      modalidad: true,
      horas: true,
    },
  });
  const claveExistente = new Set(
    existentes.map(
      (r) =>
        `${r.fecha.toISOString().slice(0, 10)}|${r.clienteId}|${r.etapaId}|${r.ownership}|${r.modalidad}|${Number(r.horas)}`,
    ),
  );
  const clavesEnLote = new Set<string>();

  const filas: FilaPreview[] = [];
  const validas: {
    fecha: Date;
    clienteId: string;
    etapaId: string;
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
    const proyecto = val("proyecto");
    const etapa = val("etapa");
    const ownershipRaw = normalizar(val("ownership"));
    const horasStr = val("horas");
    const modalidadRaw = normalizar(val("modalidad"));

    const errores: string[] = [];

    const fechaISO = parseFecha(rawFecha);
    if (!fechaISO) errores.push("Fecha inválida");
    else if (new Date(fechaISO + "T00:00:00") > hoy) errores.push("Fecha futura");

    const proy = proyPorNombre.get(normalizar(proyecto));
    if (!proyecto) errores.push("Falta el proyecto");
    else if (!proy) errores.push("Proyecto inexistente o no asignado");

    const et = etapaPorNombre.get(normalizar(etapa));
    if (!etapa) errores.push("Falta la etapa");
    else if (!et) errores.push("Etapa inexistente");

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
    if (ownership && modalidad) {
      tarifa = tarifaMap.get(`${modalidad}-${ownership}`);
      if (tarifa === undefined) errores.push("Sin tarifa para esa combinación");
    }

    // Duplicados (contra la base y dentro del mismo archivo).
    if (errores.length === 0 && fechaISO && proy && et && ownership && modalidad && horas !== null) {
      const clave = `${fechaISO}|${proy.id}|${et.id}|${ownership}|${modalidad}|${horas}`;
      if (claveExistente.has(clave)) errores.push("Registro duplicado (ya existe)");
      else if (clavesEnLote.has(clave)) errores.push("Duplicado dentro del archivo");
      else clavesEnLote.add(clave);
    }

    filas.push({
      fila: i + 2, // +1 header, +1 base 1
      fecha: fechaStr,
      proyecto,
      etapa,
      ownership: val("ownership"),
      horas: horasStr,
      modalidad: val("modalidad"),
      errores,
    });

    if (errores.length === 0 && fechaISO && proy && et && ownership && modalidad && horas !== null && tarifa !== undefined) {
      validas.push({
        fecha: new Date(fechaISO + "T00:00:00Z"),
        clienteId: proy.id,
        etapaId: et.id,
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
  const usuario = await requireGuest();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo.", columnasFaltantes: [], columnasDesconocidas: [], filas: [], validas: 0, conError: 0 };
  }
  const r = await procesar(usuario.id, archivo);
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
  const usuario = await requireGuest();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo." };
  }
  const r = await procesar(usuario.id, archivo);
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
      etapaId: v.etapaId,
      usuarioId: usuario.id,
      horas: v.horas,
      modalidad: v.modalidad,
      ownership: v.ownership,
      tarifaUsdAplicada: v.tarifa,
      montoUsd: Math.round(v.horas * v.tarifa * 100) / 100,
      creadoPorId: usuario.id,
    })),
  });

  revalidatePath("/timetracker");
  revalidatePath("/dashboard");
  const omitidas = r.filas.length - r.validas.length;
  return { importadas: r.validas.length, omitidas };
}
