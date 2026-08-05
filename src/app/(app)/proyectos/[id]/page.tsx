import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatHorasHsMin } from "@/lib/horas";
import { DIA_MS } from "@/lib/dias-habiles";
import { CurvaS } from "./curva-s";

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

  const [registros, tareas] = await Promise.all([
    prisma.registroHoras.findMany({
      where: { clienteId: id, eliminadoEn: null },
      select: {
        fecha: true,
        horas: true,
        ownership: true,
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.tareaRoadmap.findMany({
      where: { lista: { clienteId: id } },
      select: { horasEstimadas: true, estado: true, fechaFin: true },
    }),
  ]);

  // Owner y Backup del proyecto no se declaran en ninguna pantalla: se
  // deducen de quién cargó horas en cada rol, tomando al mentor con más horas
  // acumuladas. Es el único dato real disponible y se mantiene solo.
  const porMentor = new Map<string, { owner: number; backup: number }>();
  for (const r of registros) {
    const acc = porMentor.get(r.usuario.nombre) ?? { owner: 0, backup: 0 };
    if (r.ownership === "owner") acc.owner += Number(r.horas);
    else if (r.ownership === "backup") acc.backup += Number(r.horas);
    porMentor.set(r.usuario.nombre, acc);
  }
  const mentorDe = (rol: "owner" | "backup") => {
    const candidatos = [...porMentor.entries()]
      .filter(([, h]) => h[rol] > 0)
      .sort((a, b) => b[1][rol] - a[1][rol]);
    return {
      nombre: candidatos[0]?.[0] ?? "—",
      nota: candidatos[0]
        ? `${formatHorasHsMin(candidatos[0][1][rol])} cargadas${
            candidatos.length > 1 ? ` · +${candidatos.length - 1} más` : ""
          }`
        : "Sin horas cargadas en este rol",
    };
  };
  const owner = mentorDe("owner");
  const backup = mentorDe("backup");

  const presupuestadas = tareas.reduce((a, t) => a + Number(t.horasEstimadas), 0);
  const entregadas = tareas.reduce(
    (a, t) => a + (t.estado === "finalizada" ? Number(t.horasEstimadas) : 0),
    0,
  );
  const reales = registros.reduce((a, r) => a + Number(r.horas), 0);
  const avance =
    presupuestadas > 0 ? Math.round((entregadas / presupuestadas) * 100) : 0;

  const curva = construirCurvaS(
    tareas
      .filter((t) => t.estado === "finalizada")
      .map((t) => ({ fecha: t.fechaFin, horas: Number(t.horasEstimadas) })),
    registros.map((r) => ({ fecha: r.fecha, horas: Number(r.horas) })),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi titulo="Mentor Owner" valor={owner.nombre} nota={owner.nota} />
        <Kpi titulo="Mentor Backup" valor={backup.nombre} nota={backup.nota} />
        <Kpi
          titulo="Hs Presupuestadas Total"
          valor={formatHorasHsMin(presupuestadas)}
        />
        <Kpi
          titulo="Hs Presupuestadas Entregadas"
          valor={formatHorasHsMin(entregadas)}
        />
        <Kpi titulo="Hs Time Tracker" valor={formatHorasHsMin(reales)} />
      </div>

      <div className="rounded-2xl border border-dc-line bg-dc-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-sm uppercase text-white">Progreso</h2>
          <span className="text-xs text-dc-muted">
            {formatHorasHsMin(entregadas)} de {formatHorasHsMin(presupuestadas)}{" "}
            presupuestadas
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span
            role="progressbar"
            aria-valuenow={avance}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance del presupuesto entregado"
            className="block h-2.5 flex-1 overflow-hidden rounded-full bg-dc-line/60"
          >
            <span
              className="block h-full rounded-full bg-dc-peri transition-[width] duration-300"
              style={{ width: `${avance}%` }}
            />
          </span>
          <span className="w-12 text-right font-display text-base tabular-nums text-white">
            {avance}%
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-dc-line bg-dc-card p-5">
        <h2 className="font-display text-sm uppercase text-white">Curva S</h2>
        <p className="mt-1 text-xs text-dc-muted">
          Acumulado por semana: lo entregado según la fecha de fin de cada tarea
          finalizada, contra las horas reales según la fecha de cada registro.
        </p>
        <div className="mt-4">
          <CurvaS
            semanas={curva.semanas}
            entregadas={curva.entregadas}
            reales={curva.reales}
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className={CARD}>
      <p className="text-[11px] uppercase tracking-wide text-dc-muted">{titulo}</p>
      <p
        className="mt-1 truncate font-display text-lg tabular-nums text-white"
        title={valor}
      >
        {valor}
      </p>
      {nota && (
        <p className="mt-0.5 truncate text-xs text-dc-muted" title={nota}>
          {nota}
        </p>
      )}
    </div>
  );
}

// ── Curva S ───────────────────────────────────────────────────────────────

type Aporte = { fecha: Date; horas: number };

// Lunes (UTC) de la semana a la que pertenece una fecha. Las columnas @db.Date
// llegan como medianoche UTC, así que todo el cálculo va en UTC.
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha.getTime());
  const offset = (d.getUTCDay() + 6) % 7; // lunes = 0 … domingo = 6
  d.setUTCDate(d.getUTCDate() - offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Reparte los aportes en semanas y los acumula. Las dos series comparten el
// mismo eje —de la primera semana con actividad a la última— para que se
// puedan comparar punto a punto; una semana sin movimiento repite el
// acumulado anterior en vez de cortar la línea.
function construirCurvaS(
  planificados: Aporte[],
  realizados: Aporte[],
): { semanas: string[]; entregadas: number[]; reales: number[] } {
  const todos = [...planificados, ...realizados];
  if (todos.length === 0) return { semanas: [], entregadas: [], reales: [] };

  const inicio = lunesDe(
    new Date(Math.min(...todos.map((a) => a.fecha.getTime()))),
  );
  const fin = lunesDe(new Date(Math.max(...todos.map((a) => a.fecha.getTime()))));

  const sumarPorSemana = (aportes: Aporte[]) => {
    const m = new Map<number, number>();
    for (const a of aportes) {
      const k = lunesDe(a.fecha).getTime();
      m.set(k, (m.get(k) ?? 0) + a.horas);
    }
    return m;
  };
  const plan = sumarPorSemana(planificados);
  const real = sumarPorSemana(realizados);

  const semanas: string[] = [];
  const entregadas: number[] = [];
  const reales: number[] = [];
  let accPlan = 0;
  let accReal = 0;

  for (let t = inicio.getTime(); t <= fin.getTime(); t += 7 * DIA_MS) {
    const d = new Date(t);
    accPlan += plan.get(t) ?? 0;
    accReal += real.get(t) ?? 0;
    semanas.push(
      `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    entregadas.push(Math.round(accPlan * 100) / 100);
    reales.push(Math.round(accReal * 100) / 100);
  }

  return { semanas, entregadas, reales };
}
