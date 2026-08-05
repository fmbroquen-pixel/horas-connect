import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { resolverUsuarioDestino } from "@/lib/registrar-para";
import { getConceptosActivos } from "@/lib/conceptos";
import { hoyISO } from "@/lib/formato";

// Plantilla de importación: solo las columnas editables (USD/Hora y USD Total
// se calculan solos y no van en el archivo). Las columnas Cliente, Concepto,
// Ownership y Modalidad traen listas desplegables con los valores vigentes.
const CABECERAS = ["Fecha", "Cliente", "Concepto", "Ownership", "Horas", "Modalidad"];
const OWNERSHIP = ["Owner", "Backup"];
const MODALIDAD = ["Presencial", "Virtual"];
const FILAS_VALIDACION = 200; // filas donde se ofrecen los desplegables

export async function GET(request: NextRequest) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.usuario.rol === "reader") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Si un admin va a importar para otro mentor, la plantilla trae los
  // clientes de ese mentor. Para el resto, siempre los propios.
  const destinoRes = await resolverUsuarioDestino(
    sesion.usuario,
    request.nextUrl.searchParams.get("usuario"),
  );
  if (!destinoRes.ok) {
    return NextResponse.json({ error: destinoRes.error }, { status: 403 });
  }

  const proyectos = await getProyectosPermitidos(destinoRes.destino.id);
  const nombresProyecto = proyectos.map((p) => p.nombre);

  // El desplegable de Concepto es el mismo para cualquier cliente: el
  // catálogo se administra en Settings y no depende del proyecto.
  const conceptos = await getConceptosActivos();
  const nombresConcepto = conceptos.map((c) => c.nombre);

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
  cargarColumna("B", nombresConcepto);
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
    "Seleccioná un concepto existente de la lista.",
    "Seleccioná un ownership existente de la lista.",
    "Acepta formato hora:minuto (ej. 1:30) o decimal (ej. 1,5).",
    "Seleccioná una modalidad existente de la lista.",
  ];
  NOTAS.forEach((texto, i) => {
    ws.getCell(1, i + 1).note = texto;
  });

  ws.addRow([
    hoyISO(),
    nombresProyecto[0] ?? "",
    nombresConcepto[0] ?? "",
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
    3: rango("B", nombresConcepto.length), // Concepto
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
