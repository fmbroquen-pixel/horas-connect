import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosConRol } from "@/lib/proyecto-acceso";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { formatHorasHsMin } from "@/lib/horas";
import { construirCurvaHoras } from "@/lib/curva-horas";
import { hoyISO, semanaActualISO } from "@/lib/formato";
import { InfoButton } from "@/components/info-button";
import { CurvaHoras } from "@/components/curva-horas";
import { FiltrosHome } from "./filtros-home";
import { EstadoProyectos } from "./estado-proyectos";

const MAX_DIAS_FILTRO = 365;
const CARD = "rounded-2xl border border-dc-line bg-dc-card";

// Home de CORE: el panorama del portafolio del usuario. Un mentor ve los
// proyectos donde está asignado como Owner o Backup; un admin, todos. Un
// único juego de filtros (fechas + proyectos) gobierna KPIs, gráfico y
// semáforo.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; proyectos?: string }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;

  if (usuario.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;

  // Rango por defecto: últimos 90 días, para que la curva acumulada tenga
  // suficientes semanas como para leerse.
  const hoy = hoyISO();
  let desde = validarISO(params.desde) ?? restarDias(hoy, 90);
  let hasta = validarISO(params.hasta) ?? hoy;
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  if (diasEntre(desde, hasta) > MAX_DIAS_FILTRO) {
    desde = restarDias(hasta, MAX_DIAS_FILTRO);
  }

  const proyectos = await getProyectosConRol(usuario.id);
  const idsAccesibles = proyectos.map((p) => p.id);

  // Sin parámetro se muestran todos los accesibles; con parámetro, solo los
  // pedidos que además sean accesibles (un id ajeno en la URL no abre nada).
  const pedidos = (params.proyectos ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ids =
    pedidos.length > 0
      ? pedidos.filter((id) => idsAccesibles.includes(id))
      : idsAccesibles;

  const rangoFecha = {
    gte: new Date(desde + "T00:00:00Z"),
    lte: new Date(hasta + "T00:00:00Z"),
  };

  const [registros, tareas] = await Promise.all([
    // Sin filtro de usuario: el total incluye lo reportado por cualquiera.
    prisma.registroHoras.findMany({
      where: { clienteId: { in: ids }, ...SOLO_ACTIVOS, fecha: rangoFecha },
      select: { fecha: true, horas: true, usuarioId: true },
    }),
    // Las tareas entran al rango por su fecha de fin: es cuando se considera
    // entregado el presupuesto.
    prisma.tareaRoadmap.findMany({
      where: { lista: { clienteId: { in: ids } }, fechaFin: rangoFecha },
      select: { horasEstimadas: true, estado: true, fechaFin: true },
    }),
  ]);

  const presupuestadas = tareas.reduce((a, t) => a + Number(t.horasEstimadas), 0);
  const entregadas = tareas.reduce(
    (a, t) => a + (t.estado === "finalizada" ? Number(t.horasEstimadas) : 0),
    0,
  );
  const horasTotal = registros.reduce((a, r) => a + Number(r.horas), 0);
  const horasUsuario = registros.reduce(
    (a, r) => a + (r.usuarioId === usuario.id ? Number(r.horas) : 0),
    0,
  );

  // Acumulado de horas TOTALES de los proyectos elegidos (no un promedio),
  // sobre el rango elegido.
  const curva = construirCurvaHoras(
    tareas
      .filter((t) => t.estado === "finalizada")
      .map((t) => ({ fecha: t.fechaFin, horas: Number(t.horasEstimadas) })),
    registros.map((r) => ({ fecha: r.fecha, horas: Number(r.horas) })),
    { desde: rangoFecha.gte, hasta: rangoFecha.lte },
  );

  // Cumpleaños de la semana (lunes a domingo): mismo comportamiento de
  // siempre, acotado a los proyectos visibles.
  const semana = semanaActualISO();
  const diasSemanaMD = new Set(semana.map((iso) => iso.slice(5))); // "MM-DD"
  const miembrosEquipo = await prisma.miembroEquipo.findMany({
    where: { clienteId: { in: ids }, cumpleanos: { not: null } },
    include: { cliente: { select: { nombre: true } } },
  });
  const md = (d: Date) =>
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const cumpleanosSemana = miembrosEquipo
    .filter((m) => diasSemanaMD.has(md(m.cumpleanos!)))
    .map((m) => ({
      id: m.id,
      nombre: `${m.nombre} ${m.apellido}`,
      fecha: `${String(m.cumpleanos!.getUTCDate()).padStart(2, "0")}/${String(
        m.cumpleanos!.getUTCMonth() + 1,
      ).padStart(2, "0")}`,
      posicion: semana.findIndex((iso) => iso.slice(5) === md(m.cumpleanos!)),
      proyecto: m.cliente.nombre,
    }))
    .sort((a, b) => a.posicion - b.posicion || a.nombre.localeCompare(b.nombre));

  return (
    // Una sola pantalla: encabezado y KPIs fijos; gráfico, semáforo y
    // cumpleaños se reparten el alto restante y scrollean por dentro.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl uppercase text-white">
          Hola, {usuario.nombre.split(" ")[0]}
        </h1>
        <FiltrosHome
          desde={desde}
          hasta={hasta}
          maxHoy={hoy}
          proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
          seleccionados={ids}
        />
      </div>

      {idsAccesibles.length === 0 ? (
        <p className={`${CARD} mt-6 px-5 py-8 text-center text-sm text-dc-muted`}>
          {usuario.rol === "admin"
            ? "No hay proyectos activos. Creá uno desde Settings → Clientes."
            : "No estás asignado como Mentor Owner ni Backup en ningún proyecto. Un admin puede asignarlos desde Settings → Usuarios."}
        </p>
      ) : (
        <>
          <div className="mt-4 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              etiqueta="Horas Presupuestadas Total"
              valor={formatHorasHsMin(presupuestadas)}
            />
            <Kpi
              etiqueta="Hs Presupuestadas Entregadas"
              valor={formatHorasHsMin(entregadas)}
            />
            <Kpi
              etiqueta="Hs Time Tracker Total"
              valor={formatHorasHsMin(horasTotal)}
            />
            <Kpi
              etiqueta="Horas Time Tracker Usuario"
              valor={formatHorasHsMin(horasUsuario)}
              destacado
            />
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <div className="flex min-h-0 flex-col gap-4 lg:w-[68%]">
              <div
                className={`${CARD} flex h-64 shrink-0 flex-col px-5 py-3 lg:h-auto lg:min-h-0 lg:flex-1`}
              >
                <div className="flex shrink-0 items-center gap-2">
                  <h2 className="font-display text-sm uppercase text-white">
                    Horas Presupuestadas vs Horas Time Tracker
                  </h2>
                  <InfoButton>Acumulado por semana</InfoButton>
                </div>
                <div className="mt-2 min-h-0 flex-1">
                  <CurvaHoras
                    semanas={curva.semanas}
                    entregadas={curva.entregadas}
                    reales={curva.reales}
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-col lg:flex-1">
                <EstadoProyectos clienteIds={ids} />
              </div>
            </div>

            {/* Cumpleaños: título fijo, lista con scroll propio. */}
            <div
              className={`${CARD} flex max-h-64 min-h-0 flex-col p-5 lg:max-h-none lg:w-[32%]`}
            >
              <h2 className="mb-3 shrink-0 text-base font-semibold text-white">
                Cumpleaños de la semana
              </h2>
              {cumpleanosSemana.length === 0 ? (
                <p className="text-sm text-dc-muted">No hay cumpleaños esta semana.</p>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto">
                  {cumpleanosSemana.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-dc-text">{c.nombre}</p>
                        <p className="truncate text-xs text-dc-muted">{c.proyecto}</p>
                      </div>
                      <span className="shrink-0 tabular-nums text-dc-peri">
                        {c.fecha}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
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
    <div className={`${CARD} px-4 py-3`}>
      <p className="text-[11px] uppercase leading-tight tracking-wider text-dc-muted">
        {etiqueta}
      </p>
      <p
        className={`mt-1 font-display text-lg tabular-nums ${destacado ? "text-dc-pink" : "text-white"}`}
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
