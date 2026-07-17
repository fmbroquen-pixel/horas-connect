import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { rangoDefault30 } from "@/lib/formato";
import { FiltroPopover } from "@/components/filtro-popover";
import { InfoButton } from "@/components/info-button";
import { RegistrarVacacionesBoton, GRID_VACACIONES } from "./registrar-boton";
import { FilaVacacion, type VacacionFila } from "./fila-vacacion";
import { PapeleraMenu } from "../papelera/papelera-menu";

export default async function VacacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;
  const { desde, hasta } = rangoDefault30(params.desde, params.hasta);

  // Se muestran las vacaciones que se solapan con el rango elegido.
  const vacaciones = await prisma.vacacion.findMany({
    where: {
      usuarioId: usuario.id,
      eliminadoEn: null,
      fechaFin: { gte: new Date(desde + "T00:00:00Z") },
      fechaInicio: { lte: new Date(hasta + "T00:00:00Z") },
    },
    orderBy: { fechaInicio: "desc" },
  });

  const filas: VacacionFila[] = vacaciones.map((v) => ({
    id: v.id,
    fechaInicio: v.fechaInicio.toISOString().slice(0, 10),
    fechaFin: v.fechaFin.toISOString().slice(0, 10),
    dias: v.dias,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Time Off</h1>
        <InfoButton>
          Registrá tus días fuera de la oficina (pasados o futuros). Los días
          se calculan solos a partir del rango, pero podés corregirlos (por
          ejemplo, para descontar fines de semana).
        </InfoButton>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <RegistrarVacacionesBoton />
        <div className="flex items-center gap-2">
          <FiltroPopover
            basePath="/vacaciones"
            desde={desde}
            hasta={hasta}
            proyectoId=""
            proyectos={[]}
            maxHoy=""
            soloFechas
          />
          <PapeleraMenu tipo="vacacion" />
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-[700px] flex-1 flex-col">
          <div
            className={`dc-thead ${GRID_VACACIONES} shrink-0 border-b border-dc-line px-3`}
            style={{ gridTemplateColumns: "minmax(150px,1fr) minmax(150px,1fr) minmax(120px,1fr) 130px" }}
          >
            <span>Fecha inicio</span>
            <span>Fecha fin</span>
            <span>Días OOO</span>
            <span />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
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
      </div>
    </div>
  );
}
