import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";

const MAX_DIAS_FILTRO = 90;

const INPUT =
  "rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; proyecto?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;

  if (usuario.rol !== "guest") {
    return (
      <div>
        <h1 className="font-display text-xl uppercase text-white">
          Hola, {usuario.nombre.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-dc-muted">
          El informe de rentabilidad general se agrega en la próxima fase.
        </p>
        <div className="mt-8 rounded-2xl border border-dc-line bg-dc-card p-8 text-center text-dc-muted">
          Todavía no hay reportes disponibles para tu rol.
        </div>
      </div>
    );
  }

  const params = await searchParams;

  // Rango por defecto: últimos 30 días; máximo permitido: 90 días.
  const hoy = hoyISO();
  const hace30 = restarDias(hoy, 30);
  let desde = validarISO(params.desde) ?? hace30;
  let hasta = validarISO(params.hasta) ?? hoy;
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  if (diasEntre(desde, hasta) > MAX_DIAS_FILTRO) {
    desde = restarDias(hasta, MAX_DIAS_FILTRO);
  }

  const proyectos = await getProyectosPermitidos(usuario.id);
  const proyectoId = proyectos.some((p) => p.id === params.proyecto)
    ? params.proyecto
    : undefined;

  const [registros, vacaciones] = await Promise.all([
    prisma.registroHoras.findMany({
      where: {
        usuarioId: usuario.id,
        fecha: {
          gte: new Date(desde + "T00:00:00Z"),
          lte: new Date(hasta + "T00:00:00Z"),
        },
        ...(proyectoId ? { clienteId: proyectoId } : {}),
      },
      include: { cliente: true },
    }),
    prisma.vacacion.findMany({ where: { usuarioId: usuario.id } }),
  ]);

  // Agregación por proyecto.
  const porProyecto = new Map<string, { nombre: string; horas: number; monto: number }>();
  for (const r of registros) {
    const actual = porProyecto.get(r.clienteId) ?? {
      nombre: r.cliente.nombre,
      horas: 0,
      monto: 0,
    };
    actual.horas += Number(r.horas);
    actual.monto += Number(r.montoUsd);
    porProyecto.set(r.clienteId, actual);
  }
  const filas = [...porProyecto.values()].sort((a, b) => b.monto - a.monto);
  const totalHoras = filas.reduce((acc, f) => acc + f.horas, 0);
  const totalMonto = filas.reduce((acc, f) => acc + f.monto, 0);

  const anioActual = new Date().getFullYear();
  const diasVacaciones = vacaciones
    .filter((v) => v.fechaInicio.getUTCFullYear() === anioActual)
    .reduce((acc, v) => acc + v.dias, 0);

  return (
    <div>
      <h1 className="font-display text-xl uppercase text-white">
        Hola, {usuario.nombre.split(" ")[0]}
      </h1>

      <form method="GET" className="mt-6 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="desde" className="mb-1 block text-xs text-dc-muted">
            Desde
          </label>
          <input id="desde" name="desde" type="date" defaultValue={desde} max={hoy} className={INPUT} />
        </div>
        <div>
          <label htmlFor="hasta" className="mb-1 block text-xs text-dc-muted">
            Hasta
          </label>
          <input id="hasta" name="hasta" type="date" defaultValue={hasta} max={hoy} className={INPUT} />
        </div>
        <div>
          <label htmlFor="proyecto" className="mb-1 block text-xs text-dc-muted">
            Proyecto
          </label>
          <select id="proyecto" name="proyecto" defaultValue={proyectoId ?? ""} className={INPUT}>
            <option value="">Todos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-dc-purple px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Filtrar
        </button>
        <p className="w-full text-xs text-dc-muted">
          Rango máximo: {MAX_DIAS_FILTRO} días.
        </p>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi etiqueta="Horas" valor={`${formatHorasHsMin(totalHoras)} hs`} />
        <Kpi etiqueta="A cobrar (USD)" valor={formatMonto(totalMonto)} destacado />
        <Kpi etiqueta="Proyectos" valor={String(filas.length)} />
        <Kpi etiqueta={`Vacaciones ${anioActual}`} valor={`${diasVacaciones} días`} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dc-line text-left text-xs text-dc-muted">
              <th className="px-4 py-2 font-normal">Proyecto</th>
              <th className="px-4 py-2 text-right font-normal">Horas</th>
              <th className="px-4 py-2 text-right font-normal">A cobrar (USD)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre} className="border-b border-dc-line last:border-0">
                <td className="px-4 py-2 text-dc-text">{f.nombre}</td>
                <td className="px-4 py-2 text-right tabular-nums text-dc-text">
                  {formatHorasHsMin(f.horas)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-dc-text">
                  {formatMonto(f.monto)}
                </td>
              </tr>
            ))}
            {filas.length > 0 && (
              <tr className="bg-dc-card">
                <td className="px-4 py-2 font-medium text-white">Total</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums text-white">
                  {formatHorasHsMin(totalHoras)}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums text-white">
                  {formatMonto(totalMonto)}
                </td>
              </tr>
            )}
            {filas.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={3}>
                  No hay horas cargadas en el rango elegido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-dc-muted">{etiqueta}</p>
      <p
        className={`mt-1 font-display text-lg ${destacado ? "text-dc-pink" : "text-white"}`}
      >
        {valor}
      </p>
    </div>
  );
}

function validarISO(valor?: string): string | undefined {
  return valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
}

function restarDias(iso: string, dias: number): string {
  const fecha = new Date(iso + "T00:00:00Z");
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

function diasEntre(desdeISO: string, hastaISO: string): number {
  const desde = new Date(desdeISO + "T00:00:00Z");
  const hasta = new Date(hastaISO + "T00:00:00Z");
  return Math.round((hasta.getTime() - desde.getTime()) / 86400000);
}
