import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto, hoyISO, semanaActualISO } from "@/lib/formato";
import { FiltroPopover } from "@/components/filtro-popover";
import { BarrasHoras } from "./charts";

const MAX_DIAS_FILTRO = 90;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; proyecto?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;

  if (usuario.rol === "reader") redirect("/rentabilidad");

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
        eliminadoEn: null,
        fecha: {
          gte: new Date(desde + "T00:00:00Z"),
          lte: new Date(hasta + "T00:00:00Z"),
        },
        ...(proyectoId ? { clienteId: proyectoId } : {}),
      },
      include: { cliente: true, etapa: true },
    }),
    prisma.vacacion.findMany({
      where: { usuarioId: usuario.id, eliminadoEn: null },
    }),
  ]);

  // Horas y monto por proyecto.
  const porProyecto = new Map<string, { nombre: string; horas: number; monto: number }>();
  // Horas por etapa.
  const porEtapa = new Map<string, number>();
  for (const r of registros) {
    const p = porProyecto.get(r.clienteId) ?? { nombre: r.cliente.nombre, horas: 0, monto: 0 };
    p.horas += Number(r.horas);
    p.monto += Number(r.montoUsd);
    porProyecto.set(r.clienteId, p);

    const etapa = r.etapa?.etiqueta ?? "Sin etapa";
    porEtapa.set(etapa, (porEtapa.get(etapa) ?? 0) + Number(r.horas));
  }

  const proyectosOrden = [...porProyecto.values()].sort((a, b) => b.horas - a.horas);
  const totalHoras = proyectosOrden.reduce((a, f) => a + f.horas, 0);
  const totalMonto = proyectosOrden.reduce((a, f) => a + f.monto, 0);

  const etapasTop5 = [...porEtapa.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const anioActual = new Date().getFullYear();
  const diasVacaciones = vacaciones
    .filter((v) => v.fechaInicio.getUTCFullYear() === anioActual)
    .reduce((acc, v) => acc + v.dias, 0);

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));

  // Cumpleaños de la semana (lunes a domingo, fecha del sistema): solo entre
  // los clientes visibles para este usuario (mismo alcance que "proyectos").
  const semana = semanaActualISO();
  const diasSemanaMD = new Set(semana.map((iso) => iso.slice(5))); // "MM-DD"
  const miembrosEquipo = await prisma.miembroEquipo.findMany({
    where: {
      clienteId: { in: proyectos.map((p) => p.id) },
      cumpleanos: { not: null },
    },
    include: { cliente: { select: { nombre: true } } },
  });
  const cumpleanosSemana = miembrosEquipo
    .filter((m) => {
      const md = `${String(m.cumpleanos!.getUTCMonth() + 1).padStart(2, "0")}-${String(
        m.cumpleanos!.getUTCDate(),
      ).padStart(2, "0")}`;
      return diasSemanaMD.has(md);
    })
    .map((m) => ({
      id: m.id,
      nombre: `${m.nombre} ${m.apellido}`,
      fecha: `${String(m.cumpleanos!.getUTCDate()).padStart(2, "0")}/${String(
        m.cumpleanos!.getUTCMonth() + 1,
      ).padStart(2, "0")}`,
      // Posición dentro de la semana (0=lunes…6=domingo) para orden cronológico.
      posicion: semana.findIndex(
        (iso) =>
          iso.slice(5) ===
          `${String(m.cumpleanos!.getUTCMonth() + 1).padStart(2, "0")}-${String(
            m.cumpleanos!.getUTCDate(),
          ).padStart(2, "0")}`,
      ),
      proyecto: m.cliente.nombre,
    }))
    .sort((a, b) => a.posicion - b.posicion || a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl uppercase text-white">
          Hola, {usuario.nombre.split(" ")[0]}
        </h1>
        <FiltroPopover
          basePath="/dashboard"
          desde={desde}
          hasta={hasta}
          proyectoId={proyectoId ?? ""}
          proyectos={opcionesProyecto}
          maxHoy={hoy}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi etiqueta="Horas" valor={`${formatHorasHsMin(totalHoras)} hs`} />
        <Kpi etiqueta="A cobrar (USD)" valor={formatMonto(totalMonto)} destacado />
        <Kpi etiqueta="Clientes" valor={String(proyectosOrden.length)} />
        <Kpi etiqueta={`Vacaciones ${anioActual}`} valor={`${diasVacaciones} días`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-dc-line bg-dc-card p-5">
          <h2 className="mb-3 text-sm text-white">Horas por cliente</h2>
          <BarrasHoras
            labels={proyectosOrden.map((p) => p.nombre)}
            horas={proyectosOrden.map((p) => p.horas)}
            color="#8b8cff"
          />
        </div>
        <div className="rounded-2xl border border-dc-line bg-dc-card p-5">
          <h2 className="mb-3 text-sm text-white">Top 5 etapas por horas</h2>
          <BarrasHoras
            labels={etapasTop5.map(([nombre]) => nombre)}
            horas={etapasTop5.map(([, horas]) => horas)}
            color="#ff91ff"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dc-line bg-dc-card p-5">
        <h2 className="mb-3 text-sm text-white">Cumpleaños de la semana</h2>
        {cumpleanosSemana.length === 0 ? (
          <p className="text-sm text-dc-muted">
            No hay cumpleaños esta semana.
          </p>
        ) : (
          <ul className="divide-y divide-dc-line">
            {cumpleanosSemana.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-dc-text">{c.nombre}</p>
                  <p className="truncate text-xs text-dc-muted">{c.proyecto}</p>
                </div>
                <span className="shrink-0 tabular-nums text-dc-peri">{c.fecha}</span>
              </li>
            ))}
          </ul>
        )}
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
      <p className={`mt-1 font-display text-lg ${destacado ? "text-dc-pink" : "text-white"}`}>
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
