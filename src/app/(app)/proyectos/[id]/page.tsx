import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { formatHorasHsMin } from "@/lib/horas";
import { construirCurvaHoras } from "@/lib/curva-horas";
import { InfoButton } from "@/components/info-button";
import { CurvaHoras } from "@/components/curva-horas";

const CARD = "rounded-2xl border border-dc-line bg-dc-card px-4 py-3";

// Pestaña Home: el tablero de control del proyecto. Responde tres preguntas
// —quién lo lleva, cuánto se presupuestó y entregó, y si el gasto real
// acompaña al plan— y nada más: el resto de la información vive en su
// pestaña (Seguimiento, Roadmap, Equipo) o en Settings → Clientes.
export default async function ProyectoHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const [asignaciones, registros, tareas] = await Promise.all([
    prisma.proyectoAsignado.findMany({
      where: { clienteId: id, rol: { not: null } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.registroHoras.findMany({
      where: { clienteId: id, ...SOLO_ACTIVOS },
      select: { fecha: true, horas: true },
    }),
    prisma.tareaRoadmap.findMany({
      where: { lista: { clienteId: id } },
      select: { horasEstimadas: true, estado: true, fechaFin: true },
    }),
  ]);

  // Owner y Backup salen de la asignación explícita que hace el admin en
  // Settings → Usuarios; no se deducen de las horas cargadas. Un proyecto
  // tiene un único Owner y hasta dos Backup.
  const owner = asignaciones.find((a) => a.rol === "owner")?.usuario.nombre ?? "-";
  const backups = asignaciones
    .filter((a) => a.rol === "backup")
    .map((a) => a.usuario.nombre);

  const presupuestadas = tareas.reduce((a, t) => a + Number(t.horasEstimadas), 0);
  const entregadas = tareas.reduce(
    (a, t) => a + (t.estado === "finalizada" ? Number(t.horasEstimadas) : 0),
    0,
  );
  const reales = registros.reduce((a, r) => a + Number(r.horas), 0);
  const avance =
    presupuestadas > 0 ? Math.round((entregadas / presupuestadas) * 100) : 0;

  const curva = construirCurvaHoras(
    tareas
      .filter((t) => t.estado === "finalizada")
      .map((t) => ({ fecha: t.fechaFin, horas: Number(t.horasEstimadas) })),
    registros.map((r) => ({ fecha: r.fecha, horas: Number(r.horas) })),
  );

  return (
    // Una sola pantalla: KPIs y progreso fijos, y el gráfico ocupa el resto
    // del alto disponible en vez de empujar la página hacia abajo.
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid shrink-0 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi titulo="Mentor Owner" valor={owner} />
        {/* Los dos backups van juntos: la card no lleva texto secundario. */}
        <Kpi titulo="Mentor Backup" valor={backups.join(", ") || "-"} />
        <Kpi
          titulo="Hs Presupuestadas Total"
          valor={formatHorasHsMin(presupuestadas)}
        />
        <Kpi
          titulo="Hs Presupuestadas Entregadas"
          valor={formatHorasHsMin(entregadas)}
        />
        <Kpi titulo="Hs Time Tracker Total" valor={formatHorasHsMin(reales)} />
      </div>

      <div className="shrink-0 rounded-2xl border border-dc-line bg-dc-card px-5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-sm uppercase text-white">Progreso</h2>
          <span className="text-xs text-dc-muted">
            {formatHorasHsMin(entregadas)} de {formatHorasHsMin(presupuestadas)}{" "}
            presupuestadas
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span
            role="progressbar"
            aria-valuenow={avance}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance del presupuesto entregado"
            className="block h-2.5 flex-1 overflow-hidden rounded-full bg-dc-line/60"
          >
            {/* Verde: el mismo que marca "finalizada" en el Roadmap. */}
            <span
              className="block h-full rounded-full bg-[#34d399] transition-[width] duration-300"
              style={{ width: `${avance}%` }}
            />
          </span>
          <span className="w-12 text-right font-display text-base tabular-nums text-white">
            {avance}%
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dc-line bg-dc-card px-5 py-3">
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
    </div>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className={CARD}>
      <p className="text-[11px] uppercase leading-tight tracking-wide text-dc-muted">
        {titulo}
      </p>
      <p
        className="mt-1 truncate font-display text-lg tabular-nums text-white"
        title={valor}
      >
        {valor}
      </p>
    </div>
  );
}
