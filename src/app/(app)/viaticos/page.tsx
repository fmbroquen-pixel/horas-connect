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

  const [etapas, viaticos] = await Promise.all([
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.viatico.findMany({
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
    }),
  ]);

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
  const opcionesEtapa = etapas.map((e) => ({ id: e.id, nombre: e.etiqueta }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Viáticos</h1>
        <InfoButton>
          Cargá los gastos asociados a un proyecto. El comprobante es opcional.
        </InfoButton>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <RegistrarViaticoBoton proyectos={opcionesProyecto} etapas={opcionesEtapa} />
        <FiltroPopover
          basePath="/viaticos"
          desde={desde}
          hasta={hasta}
          proyectoId={proyectoId ?? ""}
          proyectos={opcionesProyecto}
          maxHoy={hoyISO()}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-[860px] flex-1 flex-col">
          <div className={`dc-thead ${GRID_VIATICOS} shrink-0 border-b border-dc-line px-3`}>
            <span>Fecha</span>
            <span>Proyecto</span>
            <span>Etapa</span>
            <span>Moneda</span>
            <span>Monto</span>
            <span>Concepto</span>
            <span>Archivo</span>
            <span />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filas.map((f) => (
              <FilaViatico
                key={f.id}
                viatico={f}
                proyectos={opcionesProyecto}
                etapas={opcionesEtapa}
              />
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
