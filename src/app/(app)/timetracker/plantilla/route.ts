import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSesionActual } from "@/lib/auth";

// Plantilla de importación: solo las columnas editables (USD/Hora y USD Total
// se calculan solos y no van en el archivo).
export async function GET() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Plantilla");
  ws.addRow(["Fecha", "Proyecto", "Etapa", "Ownership", "Horas", "Modalidad"]);
  ws.getRow(1).font = { bold: true };
  ws.addRow(["2026-05-04", "Andreu", "1:1", "Owner", "1,5", "Presencial"]);
  ws.addRow(["2026-05-05", "Conosur", "Retrospectiva", "Backup", "2", "Virtual"]);
  ws.columns.forEach((c) => {
    c.width = 16;
  });
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_timetracker.xlsx"',
    },
  });
}
