import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { prisma } from "@/lib/prisma";
import { hoyISO } from "@/lib/formato";

// Plantilla de importación: solo las columnas editables (USD/Hora y USD Total
// se calculan solos y no van en el archivo). Las columnas Cliente, Etapa,
// Ownership y Modalidad traen listas desplegables con los valores vigentes.
const CABECERAS = ["Fecha", "Cliente", "Etapa", "Ownership", "Horas", "Modalidad"];
const OWNERSHIP = ["Owner", "Backup"];
const MODALIDAD = ["Presencial", "Virtual"];
const FILAS_VALIDACION = 200; // filas donde se ofrecen los desplegables

export async function GET() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.usuario.rol === "reader") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [proyectos, etapas] = await Promise.all([
    getProyectosPermitidos(sesion.usuario.id),
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
  ]);
  const nombresProyecto = proyectos.map((p) => p.nombre);
  const nombresEtapa = etapas.map((e) => e.etiqueta);

  const wb = new ExcelJS.Workbook();

  // Hoja oculta con las opciones vigentes (fuente de los desplegables).
  const opc = wb.addWorksheet("Opciones");
  opc.state = "veryHidden";
  const cargarColumna = (col: string, valores: string[]) => {
    valores.forEach((v, i) => {
      opc.getCell(`${col}${i + 1}`).value = v;
    });
  };
  cargarColumna("A", nombresProyecto);
  cargarColumna("B", nombresEtapa);
  cargarColumna("C", OWNERSHIP);
  cargarColumna("D", MODALIDAD);

  const rango = (col: string, n: number) =>
    n > 0 ? `Opciones!$${col}$1:$${col}$${n}` : `Opciones!$${col}$1`;

  const ws = wb.addWorksheet("Plantilla");
  ws.addRow(CABECERAS);
  ws.getRow(1).font = { bold: true };

  // Comentarios de ayuda en cada encabezado (formato esperado por columna).
  const NOTAS = [
    "Acepta AAAA-MM-DD o DD/MM/AAAA.",
    "Seleccioná un cliente existente de la lista.",
    "Seleccioná una etapa existente de la lista.",
    "Seleccioná un ownership existente de la lista.",
    "Acepta formato hora:minuto (ej. 1:30) o decimal (ej. 1,5).",
    "Seleccioná una modalidad existente de la lista.",
  ];
  NOTAS.forEach((texto, i) => {
    ws.getCell(1, i + 1).note = texto;
  });

  // Fila de ejemplo completa y válida.
  ws.addRow([
    hoyISO(),
    nombresProyecto[0] ?? "",
    nombresEtapa[0] ?? "",
    OWNERSHIP[0],
    "1:30",
    MODALIDAD[0],
  ]);

  // Fecha y Horas como texto para que Excel no las auto-convierta.
  ws.getColumn(1).numFmt = "@";
  ws.getColumn(5).numFmt = "@";
  ws.columns.forEach((c) => {
    c.width = 16;
  });

  // Desplegables (Data Validation) por columna, desde la fila 2.
  const validaciones: Record<number, string> = {
    2: rango("A", nombresProyecto.length), // Proyecto
    3: rango("B", nombresEtapa.length), // Etapa
    4: rango("C", OWNERSHIP.length), // Ownership
    6: rango("D", MODALIDAD.length), // Modalidad
  };
  for (let fila = 2; fila <= FILAS_VALIDACION + 1; fila++) {
    for (const [colStr, formula] of Object.entries(validaciones)) {
      ws.getCell(fila, Number(colStr)).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Valor no válido",
        error: "Elegí una opción de la lista.",
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_timetracker.xlsx"',
    },
  });
}
