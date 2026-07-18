import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatHorasHsMin } from "@/lib/horas";
import {
  createAdminClient,
  BUCKET_COMPROBANTES,
} from "@/lib/supabase/admin";
import { BarraCaptura } from "../../../timetracker/barra-captura";
import { TablaRegistros } from "../../../timetracker/tabla-registros";
import { DIAS_VENTANA_EDICION } from "../../../timetracker/constantes";
import type { MapaTarifas, RegistroFila } from "../../../timetracker/tipos";
import { GRID_VIATICOS, type ViaticoFila } from "../../../viaticos/tipos";
import { RegistrarViaticoBoton } from "../../../viaticos/registrar-boton";
import { FilaViatico } from "../../../viaticos/fila-viatico";
import { InfoButton } from "@/components/info-button";

// Pestaña Horas y viáticos: reutiliza EXACTAMENTE los componentes y actions
// de Time Tracking y Expenses, con los datos filtrados a este cliente. No
// hay tablas propias: un registro cargado acá es el mismo registro que se ve
// en Time Tracking (única fuente de datos), y viceversa.
export default async function ProyectoHorasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();
  const { usuario, cliente } = acceso;

  const [etapas, tarifasVigentes, registros, viaticos] = await Promise.all([
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.tarifa.findMany({
      where: { usuarioId: usuario.id, vigenteHasta: null },
    }),
    prisma.registroHoras.findMany({
      where: { usuarioId: usuario.id, clienteId: id, eliminadoEn: null },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.viatico.findMany({
      where: { usuarioId: usuario.id, clienteId: id, eliminadoEn: null },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);

  const tarifas: MapaTarifas = {};
  for (const t of tarifasVigentes) {
    tarifas[`${t.modalidad}-${t.ownership}`] = Number(t.valorUsd);
  }
  const sinTarifa = Object.keys(tarifas).length === 0;

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_VENTANA_EDICION);
  limite.setHours(0, 0, 0, 0);

  const filasHoras: RegistroFila[] = registros
    .filter((r) => r.ownership !== "valor_cero")
    .map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString().slice(0, 10),
      clienteId: r.clienteId,
      etapaId: r.etapaId ?? "",
      ownership: r.ownership as "owner" | "backup",
      modalidad: r.modalidad as "presencial" | "virtual",
      horas: formatHorasHsMin(Number(r.horas)),
      tarifaUsd: Number(r.tarifaUsdAplicada),
      montoUsd: Number(r.montoUsd),
      editable: r.fecha >= limite,
    }));

  // URLs firmadas (1 hora) para los comprobantes, igual que en Expenses.
  const supabase = createAdminClient();
  const filasViaticos: ViaticoFila[] = await Promise.all(
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

  // Los formularios reciben un único cliente: el del proyecto.
  const opcionCliente = [{ id: cliente.id, nombre: cliente.nombre }];
  const opcionesEtapa = etapas.map((e) => ({ id: e.id, nombre: e.etiqueta }));

  return (
    <div className="space-y-8">
      {/* ── Horas ── */}
      <section>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">
            Horas del proyecto
          </h2>
          <InfoButton>
            Misma carga que Time Tracking, limitada a este cliente: lo que
            registrás acá aparece también en Time Tracking y viceversa.
          </InfoButton>
        </div>

        {sinTarifa ? (
          <p className="mt-4 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
            Todavía no tenés una tarifa configurada, así que no podés cargar
            horas. Pedile al administrador que la configure.
          </p>
        ) : (
          <div className="mt-4">
            <BarraCaptura
              proyectos={opcionCliente}
              etapas={opcionesEtapa}
              tarifas={tarifas}
              clienteIdInicial={cliente.id}
            />
          </div>
        )}

        <div className="mt-3 flex max-h-[420px] min-h-0 flex-col">
          <TablaRegistros
            filas={filasHoras}
            proyectos={opcionCliente}
            etapas={opcionesEtapa}
            tarifas={tarifas}
          />
        </div>
      </section>

      {/* ── Viáticos ── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm uppercase text-white">
              Viáticos del proyecto
            </h2>
            <InfoButton>
              Misma carga que Expenses, limitada a este cliente: única fuente
              de datos, sin duplicados.
            </InfoButton>
          </div>
          <RegistrarViaticoBoton
            proyectos={opcionCliente}
            clienteIdInicial={cliente.id}
          />
        </div>

        <div className="mt-4 overflow-x-auto dc-panel">
          <div className="min-w-[860px]">
            <div className={`dc-thead ${GRID_VIATICOS} border-b border-dc-line px-3`}>
              <span>Fecha</span>
              <span>Cliente</span>
              <span>Concepto</span>
              <span>Moneda</span>
              <span>Monto</span>
              <span className="flex justify-center" title="Comprobante" aria-label="Comprobante">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </span>
              <span />
            </div>

            {filasViaticos.map((f) => (
              <FilaViatico key={f.id} viatico={f} proyectos={opcionCliente} />
            ))}

            {filasViaticos.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-dc-muted">
                Todavía no cargaste viáticos en este proyecto.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
