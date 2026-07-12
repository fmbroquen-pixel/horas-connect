import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import { FilaNueva } from "./fila-nueva";
import { FilaRegistro } from "./fila-registro";
import type { MapaTarifas, RegistroFila } from "./tipos";

const DIAS_VENTANA_EDICION = 30;

export default async function TimetrackerPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const [proyectos, etapas, tarifasVigentes, registros] = await Promise.all([
    getProyectosPermitidos(usuario.id),
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.tarifa.findMany({
      where: { usuarioId: usuario.id, vigenteHasta: null },
    }),
    prisma.registroHoras.findMany({
      where: { usuarioId: usuario.id },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 200,
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-lg uppercase text-white">Timetracker</h1>
        <p className="text-sm text-dc-muted">
          {formatHorasHsMin(totalHoras)} hs · USD {formatMonto(totalUsd)}
        </p>
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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-dc-line">
        <div className={`${GRID_TIMETRACKER} border-b border-dc-line px-3 py-2 text-xs text-dc-muted`}>
          <span>Fecha</span>
          <span>Proyecto</span>
          <span>Etapa</span>
          <span>Ownership</span>
          <span>Horas</span>
          <span>Modalidad</span>
          <span className="text-right">USD/hora</span>
          <span className="text-right">USD total</span>
          <span />
        </div>

        {!sinTarifa && (
          <FilaNueva
            proyectos={opcionesProyecto}
            etapas={opcionesEtapa}
            tarifas={tarifas}
          />
        )}

        {filas.map((f) => (
          <FilaRegistro
            key={f.id}
            registro={f}
            proyectos={opcionesProyecto}
            etapas={opcionesEtapa}
            tarifas={tarifas}
          />
        ))}

        {filas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-dc-muted">
            Todavía no cargaste horas.
          </p>
        )}
      </div>
    </div>
  );
}
