import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { formatMonto } from "@/lib/formato";
import {
  createAdminClient,
  BUCKET_COMPROBANTES,
} from "@/lib/supabase/admin";
import { GRID_VIATICOS, type ViaticoFila } from "./tipos";
import { FilaNuevaViatico } from "./fila-nueva";
import { FilaViatico } from "./fila-viatico";

export default async function ViaticosPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/dashboard");

  const [proyectos, etapas, viaticos] = await Promise.all([
    getProyectosPermitidos(usuario.id),
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.viatico.findMany({
      where: { usuarioId: usuario.id },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 200,
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

  const totalArs = filas
    .filter((f) => f.moneda === "ARS")
    .reduce((acc, f) => acc + f.monto, 0);
  const totalUsd = filas
    .filter((f) => f.moneda === "USD")
    .reduce((acc, f) => acc + f.monto, 0);

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const opcionesEtapa = etapas.map((e) => ({ id: e.id, nombre: e.etiqueta }));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-lg uppercase text-white">Viáticos</h1>
        <p className="text-sm text-dc-muted">
          ARS {formatMonto(totalArs)} · USD {formatMonto(totalUsd)}
        </p>
      </div>
      <p className="mt-1 text-sm text-dc-muted">
        Cargá los gastos asociados a un proyecto. El comprobante es opcional.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-dc-line">
        <div className={`${GRID_VIATICOS} border-b border-dc-line px-3 py-2 text-xs text-dc-muted`}>
          <span>Fecha</span>
          <span>Proyecto</span>
          <span>Etapa</span>
          <span>Moneda</span>
          <span className="text-right">Monto</span>
          <span>Concepto</span>
          <span>Archivo</span>
          <span />
        </div>

        <FilaNuevaViatico proyectos={opcionesProyecto} etapas={opcionesEtapa} />

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
  );
}
