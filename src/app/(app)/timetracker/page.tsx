import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { hoyISO, rangoDefault30 } from "@/lib/formato";
import { FiltroPopover } from "@/components/filtro-popover";
import { InfoButton } from "@/components/info-button";
import { TablaRegistros } from "./tabla-registros";
import { AccionesMenu } from "./acciones-menu";
import { RegistrarHorasBoton } from "./registrar-boton";
import type { MapaTarifas, RegistroFila } from "./tipos";

const DIAS_VENTANA_EDICION = 30;

export default async function TimetrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; proyecto?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;
  // Por defecto, últimos 30 días.
  const { desde, hasta } = rangoDefault30(params.desde, params.hasta);

  const proyectos = await getProyectosPermitidos(usuario.id);
  const proyectoId = proyectos.some((p) => p.id === params.proyecto)
    ? params.proyecto
    : undefined;

  const [etapas, tarifasVigentes, registros] = await Promise.all([
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.tarifa.findMany({
      where: { usuarioId: usuario.id, vigenteHasta: null },
    }),
    prisma.registroHoras.findMany({
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
      take: 500,
    }),
  ]);

  const tarifas: MapaTarifas = {};
  for (const t of tarifasVigentes) {
    tarifas[`${t.modalidad}-${t.ownership}`] = Number(t.valorUsd);
  }

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_VENTANA_EDICION);
  limite.setHours(0, 0, 0, 0);

  const filas: RegistroFila[] = registros
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

  const sinTarifa = Object.keys(tarifas).length === 0;

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const opcionesEtapa = etapas.map((e) => ({ id: e.id, nombre: e.etiqueta }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Timetracker</h1>
        <InfoButton>
          Cargá las horas como número decimal (por ejemplo 1,5 o 1.5) y se
          muestran como 1:30. Se pueden cargar y corregir registros de los
          últimos {DIAS_VENTANA_EDICION} días; no se admiten fechas futuras.
        </InfoButton>
      </div>

      {sinTarifa && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          Todavía no tenés una tarifa configurada, así que no podés cargar
          horas. Pedile al administrador que la configure.
        </p>
      )}

      {/* Barra de acciones: creación (izq.) vs. consulta e importar/exportar (der.). */}
      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          {!sinTarifa && (
            <RegistrarHorasBoton
              proyectos={opcionesProyecto}
              etapas={opcionesEtapa}
              tarifas={tarifas}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <FiltroPopover
            basePath="/timetracker"
            desde={desde}
            hasta={hasta}
            proyectoId={proyectoId ?? ""}
            proyectos={opcionesProyecto}
            maxHoy={hoyISO()}
          />
          {!sinTarifa && (
            <AccionesMenu desde={desde} hasta={hasta} proyecto={proyectoId ?? ""} />
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <TablaRegistros
          filas={filas}
          proyectos={opcionesProyecto}
          etapas={opcionesEtapa}
          tarifas={tarifas}
        />
      </div>
    </div>
  );
}
