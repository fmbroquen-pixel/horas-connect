import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getUsuariosVisibles, idsUsuariosDelFiltro } from "@/lib/usuarios-tt";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { mesDeParams, rangoDelMes } from "@/lib/mes";

const ETIQUETA_OWNERSHIP: Record<string, string> = {
  owner: "Owner",
  backup: "Backup",
  valor_cero: "Valor cero",
};
const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  valor_cero: "Valor cero",
};

// Columnas de la exportación (mismas de la tabla).
//
// "Usuario" va siempre, incluso cuando el archivo trae uno solo: una planilla
// de horas sin decir de quién son no se puede leer fuera de la app, y sin esa
// columna tampoco se podía volver a importar un archivo de varios mentores.
const COLUMNAS = [
  "Fecha",
  "Usuario",
  "Cliente",
  "Concepto",
  "Ownership",
  "Horas",
  "Modalidad",
  "USD/Hora",
  "USD Total",
];

function fmtFecha(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const usuario = sesion.usuario;
  if (usuario.rol === "reader") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const formato = sp.get("formato") === "csv" ? "csv" : "xlsx";
  // El mismo mes que muestra la pantalla. Antes leía un rango libre; al pasar
  // el filtro a mensual, el enlace dejó de mandarlo y la exportación caía sin
  // avisar a "los últimos 30 días": mirabas junio y bajabas agosto.
  const { anio, mes } = mesDeParams(
    sp.get("anio") ?? undefined,
    sp.get("mes") ?? undefined,
  );
  const { desde, hasta } = rangoDelMes(anio, mes);
  // Los mismos proyectos que muestra la pantalla. Vacío = todos.
  const idsProyecto = (sp.get("proyectos") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  // Los mismos usuarios que muestra la pantalla. Sin filtro, TODOS los que el
  // actor puede ver: la exportación general es una sola planilla con todos los
  // mentores, no una por cabeza. El cruce con los visibles es lo que impide
  // que un mentor se baje las horas de otro escribiendo un id en la URL.
  const visibles = await getUsuariosVisibles(usuario);
  const idsUsuarios = idsUsuariosDelFiltro(visibles, sp.get("usuarios") ?? undefined);

  const registros = await prisma.registroHoras.findMany({
    where: {
      usuarioId: { in: idsUsuarios },
      ...SOLO_ACTIVOS,
      ownership: { not: "valor_cero" },
      fecha: {
        gte: new Date(desde + "T00:00:00Z"),
        lte: new Date(hasta + "T00:00:00Z"),
      },
      ...(idsProyecto.length > 0 ? { clienteId: { in: idsProyecto } } : {}),
    },
    include: {
      cliente: true,
      etapa: true,
      concepto: true,
      usuario: { select: { nombre: true } },
    },
    // Por usuario y después por fecha: una planilla de varios mentores se lee
    // por bloques, no intercalada.
    orderBy: [{ usuario: { nombre: "asc" } }, { fecha: "asc" }, { createdAt: "asc" }],
  });

  const filas = registros.map((r) => [
    fmtFecha(r.fecha),
    r.usuario.nombre,
    r.cliente.nombre,
    // Registros anteriores al catálogo: se exporta su clasificación previa
    // para no perder el dato, aunque ya no sea un valor válido al reimportar.
    r.concepto?.nombre ?? r.etapa?.etiqueta ?? "",
    ETIQUETA_OWNERSHIP[r.ownership] ?? r.ownership,
    Number(r.horas), // número decimal para permitir cálculos en la planilla
    ETIQUETA_MODALIDAD[r.modalidad] ?? r.modalidad,
    Number(r.tarifaUsdAplicada),
    Number(r.montoUsd),
  ]);

  const nombreBase = `timetracker_${desde}_a_${hasta}`;

  if (formato === "csv") {
    const escapar = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lineas = [
      COLUMNAS.join(","),
      ...filas.map((f) => f.map(escapar).join(",")),
    ];
    const csv = "﻿" + lineas.join("\r\n"); // BOM para Excel
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreBase}.csv"`,
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Timetracker");
  ws.addRow(COLUMNAS);
  ws.getRow(1).font = { bold: true };
  filas.forEach((f) => ws.addRow(f));
  ws.columns.forEach((col) => {
    col.width = 16;
  });
  ws.getColumn(5).numFmt = "0.00"; // Horas como número con decimales
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreBase}.xlsx"`,
    },
  });
}
