import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { hoyISO, rangoDefault30 } from "@/lib/formato";
import {
  createAdminClient,
  BUCKET_COMPROBANTES,
} from "@/lib/supabase/admin";
import { FiltroPopover } from "@/components/filtro-popover";
import { InfoButton } from "@/components/info-button";
import { GRID_VIATICOS, type ViaticoFila } from "./tipos";
import { RegistrarViaticoBoton } from "./registrar-boton";
import { FilaViatico } from "./fila-viatico";
import { PapeleraMenu } from "../papelera/papelera-menu";

export default async function ViaticosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; proyecto?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;
  const { desde, hasta } = rangoDefault30(params.desde, params.hasta);

  const proyectos = await getProyectosPermitidos(usuario.id);
  const proyectoId = proyectos.some((p) => p.id === params.proyecto)
    ? params.proyecto
    : undefined;

  const viaticos = await prisma.viatico.findMany({
      where: {
        usuarioId: usuario.id,
        eliminadoEn: null,
        fecha: {
          gte: new Date(desde + "T00:00:00Z"),
          lte: new Date(hasta + "T00:00:00Z"),
        },
        ...(proyectoId ? { clienteId: proyectoId } : {}),
      },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  // URLs firmadas (1 hora) para ver los comprobantes del bucket privado.
  const supabase = createAdminClient();
  const filas: ViaticoFila[] = await Promise.all(
    viaticos.map(async (v) => {
      let archivoUrl: string | null = null;
      if (v.archivoPath) {
        const { data } = await supabase.storage
          .from(BUCKET_COMPROBANTES)
          .createSignedUrl(v.archivoPath, 3600);
        archivoUrl = data?.signedUrl ?? null;
      }
      return {
        id: v.id,
        fecha: v.fecha.toISOString().slice(0, 10),
        clienteId: v.clienteId,
        etapaId: v.etapaId ?? "",
        moneda: v.moneda,
        monto: Number(v.monto),
        concepto: v.concepto,
        archivoUrl,
      };
    }),
  );

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Expenses</h1>
        <InfoButton>
          Cargá los gastos asociados a un cliente. El comprobante es opcional.
        </InfoButton>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <RegistrarViaticoBoton proyectos={opcionesProyecto} />
        <div className="flex items-center gap-2">
          <FiltroPopover
            basePath="/viaticos"
            desde={desde}
            hasta={hasta}
            proyectoId={proyectoId ?? ""}
            proyectos={opcionesProyecto}
            maxHoy={hoyISO()}
          />
          <PapeleraMenu tipo="viatico" />
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-[860px] flex-1 flex-col">
          <div className={`dc-thead ${GRID_VIATICOS} shrink-0 border-b border-dc-line px-3`}>
            <span>Fecha</span>
            <span>Cliente</span>
            <span>Concepto</span>
            <span>Moneda</span>
            <span>Monto</span>
            <span
              className="flex justify-center"
              title="Comprobante"
              aria-label="Comprobante"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </span>
            <span />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filas.map((f) => (
              <FilaViatico key={f.id} viatico={f} proyectos={opcionesProyecto} />
            ))}

            {filas.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-dc-muted">
                Todavía no cargaste viáticos.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
