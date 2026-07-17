import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { rangoDefault30, esISO } from "@/lib/formato";

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
const COLUMNAS = [
  "Fecha",
  "Cliente",
  "Etapa",
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
  const { desde, hasta } = rangoDefault30(
    sp.get("desde") ?? undefined,
    sp.get("hasta") ?? undefined,
  );
  const proyectoParam = sp.get("proyecto") ?? "";

  const registros = await prisma.registroHoras.findMany({
    where: {
      usuarioId: usuario.id,
      eliminadoEn: null,
      ownership: { not: "valor_cero" },
      fecha: {
        gte: new Date(desde + "T00:00:00Z"),
        lte: new Date(hasta + "T00:00:00Z"),
      },
      ...(esISO(proyectoParam) || proyectoParam ? { clienteId: proyectoParam } : {}),
    },
    include: { cliente: true, etapa: true },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });

  const filas = registros.map((r) => [
    fmtFecha(r.fecha),
    r.cliente.nombre,
    r.etapa?.etiqueta ?? "",
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
