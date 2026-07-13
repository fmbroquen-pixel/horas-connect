import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { FiltroPopover } from "@/components/filtro-popover";
import { TablaRegistros } from "./tabla-registros";
import type { MapaTarifas, RegistroFila } from "./tipos";

const DIAS_VENTANA_EDICION = 30;

function validarISO(v?: string) {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

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
  const desde = validarISO(params.desde);
  const hasta = validarISO(params.hasta);

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
        ...(desde || hasta
          ? {
              fecha: {
                ...(desde ? { gte: new Date(desde + "T00:00:00Z") } : {}),
                ...(hasta ? { lte: new Date(hasta + "T00:00:00Z") } : {}),
              },
            }
          : {}),
        ...(proyectoId ? { clienteId: proyectoId } : {}),
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 300,
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

  const totalHoras = registros.reduce((acc, r) => acc + Number(r.horas), 0);
  const totalUsd = registros.reduce((acc, r) => acc + Number(r.montoUsd), 0);
  const sinTarifa = Object.keys(tarifas).length === 0;

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const opcionesEtapa = etapas.map((e) => ({ id: e.id, nombre: e.etiqueta }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg uppercase text-white">Timetracker</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-dc-muted">
            {formatHorasHsMin(totalHoras)} hs · USD {formatMonto(totalUsd)}
          </p>
          <FiltroPopover
            basePath="/timetracker"
            desde={desde ?? ""}
            hasta={hasta ?? ""}
            proyectoId={proyectoId ?? ""}
            proyectos={opcionesProyecto}
            maxHoy={hoyISO()}
          />
        </div>
      </div>
      <p className="mt-1 text-sm text-dc-muted">
        Cargá las horas como número decimal (por ejemplo <strong className="text-dc-text">1,5</strong> o
        <strong className="text-dc-text"> 1.5</strong>) y se muestran como
        <strong className="text-dc-text"> 1:30</strong>. Se pueden cargar y
        corregir registros de los últimos {DIAS_VENTANA_EDICION} días; no se
        admiten fechas futuras.
      </p>

      {sinTarifa && (
        <p className="mt-4 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          Todavía no tenés una tarifa configurada, así que no podés cargar
          horas. Pedile al administrador que la configure.
        </p>
      )}

      <div className="mt-6">
        <TablaRegistros
          filas={filas}
          proyectos={opcionesProyecto}
          etapas={opcionesEtapa}
          tarifas={tarifas}
          sinTarifa={sinTarifa}
        />
      </div>
    </div>
  );
}
