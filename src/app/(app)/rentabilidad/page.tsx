import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { calcularReporte } from "@/lib/rentabilidad";
import { resolverScope } from "@/lib/scope";
import { getProyectosVisibles } from "@/lib/proyectos";
import { formatMonto } from "@/lib/formato";
import { InfoButton } from "@/components/info-button";
import { formatHorasHsMin } from "@/lib/horas";
import { MargenChart, HorasStackChart } from "./charts";
import { FiltrosModulo } from "@/components/filtros-modulo";
import { RecalculoProvider, BloqueRecalculable } from "@/components/recalculo";
import { NotaMesEditor } from "./nota-mes-editor";

export default async function RentabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    mes?: string;
    proyectos?: string;
    owners?: string;
  }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "guest") redirect("/dashboard");

  const params = await searchParams;

  // El scope de la pantalla: el mes, los proyectos elegidos y el Mentor Owner
  // elegido, resueltos en un solo lugar. Los KPIs, el margen por cliente, las
  // horas por mentor y las lecturas del mes salen todos de ese mismo recorte.
  //
  // El mes por defecto es el que corre en Argentina. Con `getUTCMonth` sobre el
  // reloj del servidor, después de las 21:00 del último día del mes Analytics
  // abría ya en el mes siguiente, vacío.
  //
  // Con el inicio del mes: Analytics es un informe de un mes cerrado, así que
  // tiene que incluir a los clientes que operaron en ese mes aunque hoy estén
  // apagados.
  const scope = await resolverScope(params, (desde) =>
    getProyectosVisibles(usuario, desde),
  );
  const { anio, mes } = scope;

  const r = await calcularReporte(usuario, scope);

  return (
    // El provider envuelve a los dos lados: el selector de mes dispara la
    // navegacion y cada bloque muestra su spinner mientras el servidor
    // recalcula. Todo lo de abajo depende del periodo, asi que va envuelto.
    <RecalculoProvider>
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-dc-pink">
            DISTRITO CONNECT · INFORME MENSUAL
          </p>
          <h1 className="mt-1 font-display text-xl uppercase text-white">
            Analytics
          </h1>
          <p className="text-sm text-dc-muted">
            {r.esAdmin
              ? "Rentabilidad de todos los clientes y usuarios"
              : "Tus clientes asignados"}
          </p>
        </div>
        <FiltrosModulo
          basePath="/rentabilidad"
          anio={anio}
          mes={mes}
          proyectosOpciones={scope.proyectosOpciones}
          proyectosSeleccionados={scope.proyectosSeleccionados}
          ownersOpciones={scope.ownersOpciones}
          ownersSeleccionados={scope.ownersSeleccionados}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BloqueRecalculable>
        <Kpi
          label="Clientes activos"
          value={String(r.kpis.clientesActivos)}
          info="Los que operaban en el mes consultado, no los activos hoy."
        />
        </BloqueRecalculable>
        <BloqueRecalculable>
        <Kpi
          label="Cobrado"
          value={`$${formatMonto(r.kpis.cobrado)}`}
          sub="USD"
          info="Sin IVA"
        />
        </BloqueRecalculable>
        <BloqueRecalculable>
        <Kpi
          label="Margen global"
          value={`$${formatMonto(r.kpis.margen)}`}
          sub={
            r.kpis.margenPct === null
              ? "sin cobrado"
              : `${r.kpis.margenPct.toFixed(1)}% sobre cobrado`
          }
          destacado
        />
        </BloqueRecalculable>
        <BloqueRecalculable>
        <Kpi
          label="Horas entregadas"
          value={`${formatHorasHsMin(r.kpis.horas)} hs`}
          sub={`${formatHorasHsMin(r.kpis.horasFacturables)} hs facturables`}
        />
        </BloqueRecalculable>
      </div>

      {/* 01 Margen por proyecto */}
      <section>
        <SecHead num="01" title="Margen por cliente" sub="Cobrado menos costo de mentores, en USD. De menor a mayor margen; los que no lo tienen, al final." />
        <BloqueRecalculable>
        <div className="mt-4 rounded-2xl border border-dc-line bg-dc-card p-5">
          <MargenChart
            proyectos={r.filasProyecto.map((f) => f.nombre)}
            cobrado={r.filasProyecto.map((f) => f.cobrado)}
            costo={r.filasProyecto.map((f) => f.costo)}
            pct={r.filasProyecto.map((f) => f.margenPct)}
          />

        </div>
        </BloqueRecalculable>
      </section>

      {/* 02 Horas por proyecto y mentor */}
      <section>
        <SecHead num="02" title="Horas por cliente y mentor" sub="Horas entregadas, apiladas por quién las entregó. De más a menos." />
        <BloqueRecalculable>
        <div className="mt-4 rounded-2xl border border-dc-line bg-dc-card p-5">
          <HorasStackChart stack={r.horasStack} />
        </div>
        </BloqueRecalculable>
      </section>

      {/* 03 Resumen por mentor.
          Sin guard de esAdmin a proposito: los honorarios de cada mentor se
          muestran a todo el que llega a esta pantalla. Los guest no llegan
          -hay un redirect arriba- y que los reader los vean esta decidido, no
          olvidado. */}
      <section>
        <SecHead num="03" title="Resumen por mentor" />
        <BloqueRecalculable>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {r.filasMentor.map((m) => (
            <div key={m.usuarioId} className="rounded-2xl border border-dc-line bg-dc-card p-5">
              <h3 className="font-display text-sm text-white">{m.nombre}</h3>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  <FilaResumen k="Horas" v={`${formatHorasHsMin(m.horas)} hs`} />
                  <FilaResumen k="Honorarios" v={`USD ${formatMonto(m.honorarios)}`} />
                  <FilaResumen k="Clientes" v={String(m.proyectos)} />
                  <FilaResumen k="USD/hora" v={m.usdPorHora === null ? "—" : formatMonto(m.usdPorHora)} />
                </tbody>
              </table>
            </div>
          ))}
          {r.filasMentor.length === 0 && (
            <p className="text-sm text-dc-muted">No hay horas cargadas este mes.</p>
          )}
        </div>
        </BloqueRecalculable>
      </section>

      {/* 04 Lecturas del mes */}
      <section>
        <SecHead num="04" title="Lecturas del mes" sub="Observaciones cualitativas del período." />
        <BloqueRecalculable>
        <div className="mt-4">
          {r.esAdmin ? (
            <NotaMesEditor anio={anio} mes={mes} texto={r.nota} />
          ) : r.nota ? (
            <p className="whitespace-pre-wrap rounded-xl border border-dc-line bg-dc-card p-4 text-sm text-dc-text">
              {r.nota}
            </p>
          ) : (
            <p className="text-sm text-dc-muted">Todavía no hay notas para este mes.</p>
          )}
        </div>
        </BloqueRecalculable>
      </section>
    </div>
    </RecalculoProvider>
  );
}

function Kpi({
  label,
  value,
  sub,
  destacado,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  destacado?: boolean;
  // Aclaración que el rótulo no puede llevar sin volverse una frase. La usa
  // Cobrado, que va sin IVA.
  info?: string;
}) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card px-5 py-4">
      <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-dc-muted">
        {label}
        {info && <InfoButton>{info}</InfoButton>}
      </p>
      <p className={`mt-1 font-display text-2xl ${destacado ? "text-dc-pink" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-dc-peri">{sub}</p>}
    </div>
  );
}

function SecHead({ num, title, sub }: { num: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-xs text-dc-pink">{num}</span>
        <h2 className="text-lg text-white">{title}</h2>
      </div>
      {sub && <p className="mt-1 text-sm text-dc-muted">{sub}</p>}
    </div>
  );
}

function FilaResumen({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-dc-line last:border-0">
      <td className="py-1.5 text-dc-muted">{k}</td>
      <td className="py-1.5 text-right text-dc-text">{v}</td>
    </tr>
  );
}
