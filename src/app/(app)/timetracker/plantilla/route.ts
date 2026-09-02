import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { getUsuariosVisibles } from "@/lib/usuarios-tt";
import { getConceptosActivos } from "@/lib/conceptos";
import { hoyISO } from "@/lib/formato";

// Plantilla de importación: solo las columnas editables (USD/Hora y USD Total
// se calculan solos y no van en el archivo). Las columnas Cliente, Concepto,
// Ownership y Modalidad traen listas desplegables con los valores vigentes.
const CABECERAS = [
  "Fecha",
  "Usuario",
  "Cliente",
  "Concepto",
  "Ownership",
  "Horas",
  "Modalidad",
];
const OWNERSHIP = ["Owner", "Backup"];
const MODALIDAD = ["Presencial", "Virtual"];
const FILAS_VALIDACION = 200; // filas donde se ofrecen los desplegables

// Sin parámetros: la plantilla ya no se pide "para" un mentor, trae a todos.
export async function GET() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.usuario.rol === "reader") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Un solo archivo para varios mentores. El desplegable de Usuario trae a
  // todos los que el actor puede cargar; el de Cliente, la unión de los
  // clientes de todos ellos.
  //
  // La unión y no la intersección: si dos mentores no comparten cartera, la
  // intersección estaría vacía y la plantilla no serviría para ninguno. Que un
  // par Usuario+Cliente inválido pase el desplegable es aceptable —el
  // importador lo rechaza fila por fila y dice exactamente por qué—; una lista
  // vacía no tiene arreglo del lado de quien completa el archivo.
  const usuarios = await getUsuariosVisibles(sesion.usuario);
  const nombresUsuario = usuarios.map((u) => u.nombre);

  const carteras = await Promise.all(
    usuarios.map((u) => getProyectosPermitidos(u.id)),
  );
  const nombresProyecto = [
    ...new Set(carteras.flat().map((p) => p.nombre)),
  ].sort((a, b) => a.localeCompare(b));

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
  cargarColumna("E", nombresUsuario);

  const rango = (col: string, n: number) =>
    n > 0 ? `Opciones!$${col}$1:$${col}$${n}` : `Opciones!$${col}$1`;

  const ws = wb.addWorksheet("Plantilla");
  ws.addRow(CABECERAS);
  ws.getRow(1).font = { bold: true };

  // Comentarios de ayuda en cada encabezado (formato esperado por columna).
  const NOTAS = [
    "Acepta AAAA-MM-DD o DD/MM/AAAA.",
    "Seleccioná el mentor dueño de las horas. Un mismo archivo puede tener varios.",
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
    nombresUsuario[0] ?? "",
    nombresProyecto[0] ?? "",
    nombresConcepto[0] ?? "",
    OWNERSHIP[0],
    "1:30",
    MODALIDAD[0],
  ]);

  // Fecha y Horas como texto para que Excel no las auto-convierta.
  ws.getColumn(1).numFmt = "@";
  ws.getColumn(6).numFmt = "@";
  ws.columns.forEach((c) => {
    c.width = 16;
  });

  // Desplegables (Data Validation) por columna, desde la fila 2.
  const validaciones: Record<number, string> = {
    2: rango("E", nombresUsuario.length), // Usuario
    3: rango("A", nombresProyecto.length), // Cliente
    4: rango("B", nombresConcepto.length), // Concepto
    5: rango("C", OWNERSHIP.length), // Ownership
    7: rango("D", MODALIDAD.length), // Modalidad
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
