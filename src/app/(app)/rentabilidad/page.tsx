import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { calcularReporte } from "@/lib/rentabilidad";
import { formatMonto } from "@/lib/formato";
import { formatHorasHsMin } from "@/lib/horas";
import { MargenChart, HorasStackChart } from "./charts";
import { SelectorMes } from "./selector-mes";
import { FacturacionInput } from "./facturacion-input";
import { NotaMesEditor } from "./nota-mes-editor";

export default async function RentabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "guest") redirect("/dashboard");

  const params = await searchParams;
  const hoy = new Date();
  const anio = Number(params.anio) || hoy.getUTCFullYear();
  const mes = Number(params.mes) || hoy.getUTCMonth() + 1;

  const r = await calcularReporte(usuario, anio, mes);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-dc-pink">
            DISTRITO CONNECT · INFORME MENSUAL
          </p>
          <h1 className="mt-1 font-display text-xl uppercase text-white">
            Dashboard
          </h1>
          <p className="text-sm text-dc-muted">
            {r.esAdmin
              ? "Rentabilidad de todos los proyectos y usuarios"
              : "Tus proyectos asignados"}
          </p>
        </div>
        <SelectorMes anio={anio} mes={mes} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Proyectos con actividad" value={String(r.kpis.proyectosConActividad)} />
        <Kpi label="Facturado" value={`$${formatMonto(r.kpis.facturado)}`} sub="USD" />
        <Kpi
          label="Margen global"
          value={`$${formatMonto(r.kpis.margen)}`}
          sub={
            r.kpis.margenPct === null
              ? "sin facturación"
              : `${r.kpis.margenPct.toFixed(1)}% sobre facturación`
          }
          destacado
        />
        <Kpi
          label="Horas entregadas"
          value={`${formatHorasHsMin(r.kpis.horas)} hs`}
          sub={`${formatHorasHsMin(r.kpis.horasFacturables)} hs facturables`}
        />
      </div>

      {/* 01 Margen por proyecto */}
      <section>
        <SecHead num="01" title="Margen por proyecto" sub="Facturación menos costo de mentores, en USD." />
        <div className="mt-4 rounded-2xl border border-dc-line bg-dc-card p-5">
          <MargenChart
            proyectos={r.filasProyecto.map((f) => f.nombre)}
            margenes={r.filasProyecto.map((f) => f.margen)}
            pct={r.filasProyecto.map((f) => f.margenPct)}
          />
        </div>

        <div className="mt-4 overflow-x-auto dc-panel">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-dc-line text-xs text-dc-muted">
                <th className="px-4 py-2">Proyecto</th>
                <th className="px-4 py-2">Facturado</th>
                <th className="px-4 py-2">Costo mentores</th>
                <th className="px-4 py-2">Margen</th>
                <th className="px-4 py-2">Margen %</th>
                <th className="px-4 py-2">Horas</th>
              </tr>
            </thead>
            <tbody>
              {r.filasProyecto.map((f) => (
                <tr key={f.clienteId} className="border-b border-dc-line last:border-0">
                  <td className="px-4 py-2 text-dc-text">{f.nombre}</td>
                  <td className="px-4 py-2 text-right">
                    {r.esAdmin ? (
                      <FacturacionInput
                        clienteId={f.clienteId}
                        anio={anio}
                        mes={mes}
                        valor={f.facturado}
                      />
                    ) : (
                      <span className="tabular-nums text-dc-text">{formatMonto(f.facturado)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-dc-text">{formatMonto(f.costo)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${f.margen < 0 ? "text-dc-pink" : "text-dc-text"}`}>
                    {formatMonto(f.margen)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-dc-muted">
                    {f.margenPct === null ? "—" : `${f.margenPct.toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-dc-text">{formatHorasHsMin(f.horas)}</td>
                </tr>
              ))}
              {r.filasProyecto.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-dc-muted" colSpan={6}>
                    No hay actividad ni facturación cargada en este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 02 Horas por proyecto y mentor */}
      <section>
        <SecHead num="02" title="Horas por proyecto y mentor" sub="Horas entregadas, apiladas por quién las entregó." />
        <div className="mt-4 rounded-2xl border border-dc-line bg-dc-card p-5">
          <HorasStackChart stack={r.horasStack} />
        </div>
      </section>

      {/* 03 Resumen por mentor */}
      <section>
        <SecHead num="03" title="Resumen por mentor" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {r.filasMentor.map((m) => (
            <div key={m.usuarioId} className="rounded-2xl border border-dc-line bg-dc-card p-5">
              <h3 className="font-display text-sm text-white">{m.nombre}</h3>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  <FilaResumen k="Horas" v={`${formatHorasHsMin(m.horas)} hs`} />
                  <FilaResumen k="Honorarios" v={`USD ${formatMonto(m.honorarios)}`} />
                  <FilaResumen k="Proyectos" v={String(m.proyectos)} />
                  <FilaResumen k="USD/hora" v={m.usdPorHora === null ? "—" : formatMonto(m.usdPorHora)} />
                </tbody>
              </table>
            </div>
          ))}
          {r.filasMentor.length === 0 && (
            <p className="text-sm text-dc-muted">No hay horas cargadas este mes.</p>
          )}
        </div>
      </section>

      {/* 04 Totales por modalidad */}
      <section>
        <SecHead num="04" title="Horas por modalidad" />
        <div className="mt-4 flex flex-wrap gap-3">
          {r.totalesModalidad.map((t) => (
            <div key={t.modalidad} className="rounded-xl border border-dc-line bg-dc-card px-5 py-3">
              <p className="text-[11px] uppercase tracking-wider text-dc-muted">{t.modalidad}</p>
              <p className="mt-1 font-display text-lg text-white">{formatHorasHsMin(t.horas)} hs</p>
            </div>
          ))}
          {r.totalesModalidad.length === 0 && (
            <p className="text-sm text-dc-muted">Sin horas cargadas.</p>
          )}
        </div>
      </section>

      {/* 05 Lecturas del mes */}
      <section>
        <SecHead num="05" title="Lecturas del mes" sub="Observaciones cualitativas del período." />
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
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  destacado,
}: {
  label: string;
  value: string;
  sub?: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card px-5 py-4">
      <p className="text-[10.5px] uppercase tracking-wider text-dc-muted">{label}</p>
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
