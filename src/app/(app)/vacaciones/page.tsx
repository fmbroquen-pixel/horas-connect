import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { FilaNuevaVacacion, GRID_VACACIONES } from "./fila-nueva";
import { FilaVacacion, type VacacionFila } from "./fila-vacacion";

export default async function VacacionesPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const vacaciones = await prisma.vacacion.findMany({
    where: { usuarioId: usuario.id, eliminadoEn: null },
    orderBy: { fechaInicio: "desc" },
  });

  const anioActual = new Date().getFullYear();
  const diasEsteAnio = vacaciones
    .filter((v) => v.fechaInicio.getUTCFullYear() === anioActual)
    .reduce((acc, v) => acc + v.dias, 0);

  const filas: VacacionFila[] = vacaciones.map((v) => ({
    id: v.id,
    fechaInicio: v.fechaInicio.toISOString().slice(0, 10),
    fechaFin: v.fechaFin.toISOString().slice(0, 10),
    dias: v.dias,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-lg uppercase text-white">Vacaciones</h1>
        <p className="text-sm text-dc-muted">
          {diasEsteAnio} días OOO en {anioActual}
        </p>
      </div>
      <p className="mt-1 text-sm text-dc-muted">
        Registrá tus días fuera de la oficina (pasados o futuros). Los días se
        calculan solos a partir del rango, pero podés corregirlos (por
        ejemplo, para descontar fines de semana).
      </p>

      <div className="mt-6 overflow-x-auto dc-panel">
        <div className={`dc-thead ${GRID_VACACIONES} border-b border-dc-line px-3 py-2 text-xs text-dc-muted`}>
          <span>Fecha inicio</span>
          <span>Fecha fin</span>
          <span className="text-right">Días OOO</span>
          <span />
        </div>

        <FilaNuevaVacacion />

        {filas.map((f) => (
          <FilaVacacion key={f.id} vacacion={f} />
        ))}

        {filas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-dc-muted">
            Todavía no registraste vacaciones.
          </p>
        )}
      </div>
    </div>
  );
}
