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
import { SemaforoEvolucion, NIVEL_SEMAFORO } from "@/components/semaforo-evolucion";
import { lunesDe } from "@/lib/curva-horas";
import { DIA_MS } from "@/lib/dias-habiles";
import { FiltrosHome } from "./filtros-home";
import { EstadoProyectos } from "./estado-proyectos";
import { EtapasProximas, type EtapaProxima } from "./etapas-proximas";

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

  // Etapas próximas: lo que arranca en los próximos 14 días y todavía no
  // empezó. No usa el rango de fechas del filtro —que mira hacia atrás— sino
  // una ventana fija hacia adelante: la pregunta es "qué se viene".
  const hoyUtc = new Date(hoy + "T00:00:00Z");
  const en14dias = new Date(hoyUtc.getTime() + 14 * DIA_MS);
  const tareasProximas = await prisma.tareaRoadmap.findMany({
    where: {
      lista: { clienteId: { in: ids } },
      estado: "sin_iniciar",
      fechaInicio: { gte: hoyUtc, lte: en14dias },
    },
    orderBy: { fechaInicio: "asc" },
    select: {
      id: true,
      nombre: true,
      fechaInicio: true,
      personas: true,
      lista: { select: { cliente: { select: { nombre: true } } } },
    },
  });
  const etapasProximas: EtapaProxima[] = tareasProximas.map((t) => ({
    id: t.id,
    proyecto: t.lista.cliente.nombre,
    tarea: t.nombre,
    fecha: `${String(t.fechaInicio.getUTCDate()).padStart(2, "0")}/${String(
      t.fechaInicio.getUTCMonth() + 1,
    ).padStart(2, "0")}`,
    personas: t.personas,
  }));

  // Evolución del semáforo: una serie por proyecto sobre el eje semanal del
  // rango filtrado. Para cada semana vale el último evento ocurrido hasta
  // ella —incluidos los anteriores al rango, o el gráfico arrancaría vacío
  // aunque el proyecto ya tuviera un estado.
  const eventosSemaforo = await prisma.semaforoEvento.findMany({
    where: { clienteId: { in: ids }, createdAt: { lte: rangoFecha.lte } },
    orderBy: { createdAt: "asc" },
    select: {
      clienteId: true,
      estado: true,
      createdAt: true,
      cliente: { select: { nombre: true } },
    },
  });

  const semanasSemaforo: string[] = [];
  const finesDeSemana: number[] = [];
  for (
    let t = lunesDe(rangoFecha.gte).getTime();
    t <= lunesDe(rangoFecha.lte).getTime();
    t += 7 * DIA_MS
  ) {
    const d = new Date(t);
    semanasSemaforo.push(
      `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    // El corte de cada semana es su domingo a la noche.
    finesDeSemana.push(t + 7 * DIA_MS - 1);
  }

  const porProyecto = new Map<string, { nombre: string; eventos: typeof eventosSemaforo }>();
  for (const e of eventosSemaforo) {
    const acc = porProyecto.get(e.clienteId) ?? { nombre: e.cliente.nombre, eventos: [] };
    acc.eventos.push(e);
    porProyecto.set(e.clienteId, acc);
  }
  const seriesSemaforo = [...porProyecto.values()].map(({ nombre, eventos }) => ({
    proyecto: nombre,
    niveles: finesDeSemana.map((corte) => {
      const vigente = eventos.filter((e) => e.createdAt.getTime() <= corte).at(-1);
      return vigente ? (NIVEL_SEMAFORO[vigente.estado] ?? null) : null;
    }),
  }));

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
    // El encabezado y los filtros quedan fijos; todo el contenido scrollea
    // por dentro, así la navegación no se va de pantalla.
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
        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

          {/* Fila superior: el estado del portafolio a la izquierda y, a la
              derecha, las dos cards de agenda apiladas. */}
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="flex h-96 flex-col">
              <EstadoProyectos clienteIds={ids} />
            </div>
            <div className="grid gap-4 lg:h-96 lg:grid-rows-2">
              <div className="flex max-h-64 min-h-0 flex-col rounded-2xl border border-dc-line bg-dc-card p-5 lg:max-h-none">
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

              <EtapasProximas etapas={etapasProximas} />
            </div>
          </div>

          {/* Debajo, los dos gráficos, uno por fila. */}
          <div className={`${CARD} flex h-72 flex-col px-5 py-3`}>
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

          <div className={`${CARD} flex h-72 flex-col px-5 py-3`}>
            <div className="flex shrink-0 items-center gap-2">
              <h2 className="font-display text-sm uppercase text-white">
                Evolución del Semáforo
              </h2>
              <InfoButton>
                Cada cambio se sostiene hasta el siguiente; por eso la línea es
                escalonada y no una diagonal entre estados.
              </InfoButton>
            </div>
            <div className="mt-2 min-h-0 flex-1">
              <SemaforoEvolucion fechas={semanasSemaforo} series={seriesSemaforo} />
            </div>
          </div>
        </div>
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
