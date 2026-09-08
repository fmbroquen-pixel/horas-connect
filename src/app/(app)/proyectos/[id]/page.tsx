import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { tareasVivas } from "@/lib/roadmap-papelera";
import { formatHorasHsMin } from "@/lib/horas";
import { construirCurvaHoras } from "@/lib/curva-horas";
import { InfoButton } from "@/components/info-button";
import { KPI_ROTULO } from "@/components/ui/kpi-estilos";
import { CurvaHoras } from "@/components/curva-horas";
import { SemaforoKpi } from "./semaforo-kpi";
import { COLOR_SEMAFORO, ETIQUETA_SEMAFORO } from "../constantes";
import { formatFecha, hoyISO } from "@/lib/formato";
import {
  finDeServicioISO,
  mesesDeServicioRestantes,
  nivelDeServicio,
} from "@/lib/servicio-cliente";

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

  const [asignaciones, registros, tareas, semaforo] = await Promise.all([
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
      where: tareasVivas({ clienteId: id }),
      select: { horasEstimadas: true, estado: true, fechaFin: true },
    }),
    // El semáforo vive acá desde que se lo movió de Follow Up: es un indicador
    // de estado del proyecto, y su lugar es el tablero de control y no la
    // pantalla del plan de trabajo. El dato es el mismo evento de siempre.
    prisma.semaforoEvento.findFirst({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Owner y Backup salen de la asignación explícita que hace el admin en
  // Settings → Usuarios; no se deducen de las horas cargadas. Un proyecto
  // tiene un único Owner y varios Backup (el tope vive en MAX_BACKUPS).
  const owner = asignaciones.find((a) => a.rol === "owner")?.usuario.nombre ?? "-";
  const backups = asignaciones
    .filter((a) => a.rol === "backup")
    .map((a) => a.usuario.nombre);

  // Cuántos backups entran en la card antes de resumir. Dos es lo que entraba
  // cómodo cuando ese era además el tope; con el tope en cinco sigue siendo lo
  // que se lee sin recortar.
  const BACKUPS_A_LA_VISTA = 2;
  const backupsVisibles = backups.slice(0, BACKUPS_A_LA_VISTA);
  const backupsOcultos = backups.slice(BACKUPS_A_LA_VISTA);

  // Meses de servicio que quedan. La fecha de fin no se guarda: sale de
  // fechaInicio + duracionMeses, la misma cuenta que muestra Settings →
  // Clientes como campo de solo lectura.
  const finServicio = finDeServicioISO(
    acceso.cliente.fechaInicio?.toISOString().slice(0, 10) ?? null,
    acceso.cliente.duracionMeses,
  );
  const mesesRestantes = mesesDeServicioRestantes(finServicio, hoyISO());

  const presupuestadas = tareas.reduce((a, t) => a + Number(t.horasEstimadas), 0);
  const entregadas = tareas.reduce(
    (a, t) => a + (t.estado === "finalizada" ? Number(t.horasEstimadas) : 0),
    0,
  );
  const reales = registros.reduce((a, r) => a + Number(r.horas), 0);
  // Las dos medidas van contra el MISMO denominador —lo estimado— para poder
  // compararlas de un vistazo: cuánto del presupuesto se entregó y cuánto se
  // consumió de verdad. Que la segunda barra pase a la primera es la señal de
  // que el proyecto está gastando más horas de las que va entregando.
  const pct = (valor: number) =>
    presupuestadas > 0 ? Math.round((valor / presupuestadas) * 100) : 0;
  const avanceEntregado = pct(entregadas);
  const avanceReal = pct(reales);

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
      {/* El semáforo entra en la misma fila que los KPIs, con una pista propia
          más angosta: es un punto de color, no necesita el ancho de una card de
          texto, y darle una sexta columna igual apretaba a las otras cinco. */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-3 lg:grid-cols-[6.5rem_minmax(0,1.5fr)_9rem_repeat(3,minmax(0,1fr))]">
        <div className={`${CARD} flex flex-col`}>
          {/* Rótulo y punto centrados: la card no tiene texto que alinear a la
              izquierda, solo un punto, y con los dos al centro se lee como una
              unidad. El punto se queda en la fila de alto fijo de los valores,
              así que sigue sobre la misma línea óptica que las otras cinco. */}
          <p className={`${KPI_ROTULO} justify-center`}>Semáforo</p>
          <p className="mt-1 flex h-8 items-center justify-center">
            <SemaforoKpi
              clienteId={id}
              nombre={acceso.cliente.nombre}
              semaforo={semaforo?.estado ?? ""}
              ultimoCambio={
                semaforo
                  ? `Último cambio: ${ETIQUETA_SEMAFORO[semaforo.estado] ?? "—"} · ${formatFecha(semaforo.createdAt)}`
                  : "Sin cambios registrados"
              }
              activo={acceso.cliente.activo}
            />
          </p>
        </div>

        {/* Owner y Backup en una sola card. Eran dos, y eso gastaba dos
            columnas para decir lo mismo -quién lleva el proyecto- con la
            mitad del rótulo repetido. Juntas caben en el alto de una card
            normal: dos renglones de 11px entran en la misma caja de alto fijo
            donde las otras ponen su número, así que la fila no crece.

            Hasta dos backups a la vista y el resto en un "+N". Con el tope en
            cinco, ponerlos los cinco en una línea no los hacía legibles -se
            recortaban a la mitad de un nombre- y encima escondía cuántos eran.
            El contador dice de entrada si hay más gente sin pasar por encima. */}
        <div className={`${CARD} flex flex-col`}>
          <p className={KPI_ROTULO}>Mentores</p>
          <div className="mt-1 flex h-8 flex-col justify-center gap-0.5 text-[11px] leading-tight">
            <LineaMentor rol="Owner" valor={owner} />
            <LineaMentor
              rol="Backup"
              valor={backupsVisibles.join(", ") || "—"}
              resto={backupsOcultos}
            />
          </div>
        </div>

        {/* Cuánto contrato queda. El color es el mismo verde/amarillo/rojo del
            semáforo del proyecto: no hace falta un segundo vocabulario para
            decir "esto se está por terminar". */}
        <Kpi
          titulo="Meses de servicio"
          valor={mesesRestantes === null ? "—" : String(mesesRestantes)}
          color={mesesRestantes === null ? undefined : COLOR_SEMAFORO[nivelDeServicio(mesesRestantes)]}
          info={
            finServicio
              ? `Meses completos hasta el ${formatFecha(new Date(finServicio + "T00:00:00Z"))}, el último día de servicio. Se redondea siempre hacia abajo.`
              : "Falta la fecha de inicio o la duración del servicio. Se cargan en Settings → Clientes."
          }
        />
        <Kpi
          titulo="Hs estimadas de proyecto"
          valor={formatHorasHsMin(presupuestadas)}
          info="Suma de horas estimadas de todas las tareas."
        />
        <Kpi
          titulo="Hs estimadas entregadas"
          valor={formatHorasHsMin(entregadas)}
          info="Suma de horas estimadas de todas las tareas con estado Finalizado."
        />
        <Kpi titulo="Hs Time Tracker Total" valor={formatHorasHsMin(reales)} />
      </div>

      <div className="shrink-0 rounded-2xl border border-dc-line bg-dc-card px-5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-sm uppercase text-white">Progreso</h2>
          <span className="text-xs text-dc-muted">
            sobre {formatHorasHsMin(presupuestadas)} estimadas
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          <BarraProgreso
            etiqueta="Entregadas"
            horas={formatHorasHsMin(entregadas)}
            porcentaje={avanceEntregado}
            color="#34d399"
          />
          <BarraProgreso
            etiqueta="Time Tracker"
            horas={formatHorasHsMin(reales)}
            porcentaje={avanceReal}
            color="#ff91ff"
          />
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

// Una medida del progreso contra lo estimado. El relleno se recorta al 100%
// para no desbordar la barra, pero el número muestra el valor real: si el
// consumo se pasó del presupuesto, esconderlo sería justo perder el dato que
// importa.
function BarraProgreso({
  etiqueta,
  horas,
  porcentaje,
  color,
}: {
  etiqueta: string;
  horas: string;
  porcentaje: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-dc-muted">
        {etiqueta}
      </span>
      <span
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${etiqueta}: ${horas} (${porcentaje}% de lo estimado)`}
        className="block h-2.5 flex-1 overflow-hidden rounded-full bg-dc-line/60"
      >
        <span
          className="block h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.min(porcentaje, 100)}%`, backgroundColor: color }}
        />
      </span>
      <span className="w-20 text-right text-xs tabular-nums text-dc-muted">
        {horas}
      </span>
      <span className="w-12 text-right font-display text-base tabular-nums text-white">
        {porcentaje}%
      </span>
    </div>
  );
}

// Un renglón de la card de Mentores: el rol apagado y el nombre en primer
// plano. El rol tiene ancho fijo para que los dos nombres arranquen alineados.
function LineaMentor({
  rol,
  valor,
  resto,
}: {
  rol: string;
  valor: string;
  resto?: string[];
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-dc-muted">{rol}</span>
      <span className="truncate font-medium text-white" data-tooltip={valor}>
        {valor}
      </span>
      {resto && resto.length > 0 && (
        <span
          className="shrink-0 rounded-full bg-dc-peri/15 px-1.5 text-[10px] font-semibold tabular-nums text-dc-peri"
          data-tooltip={`${resto.length} más: ${resto.join(", ")}`}
          aria-label={`${resto.length} más: ${resto.join(", ")}`}
        >
          +{resto.length}
        </span>
      )}
    </span>
  );
}

function Kpi({
  titulo,
  valor,
  info,
  texto = false,
  resto,
  color,
}: {
  titulo: string;
  valor: string;
  // Color del número, cuando el valor tiene un estado y no solo una magnitud
  // (los meses de servicio que quedan). Sin color va en blanco, como el resto.
  color?: string;
  // Los KPIs de horas explican su criterio acá en vez de dejar que se deduzca
  // comparando números. Mismo componente que en el Home de CORE.
  info?: string;
  // Un nombre no es una cifra: va más chico y sin tabular-nums. Antes iba
  // además en dos líneas, y eso era lo que descolocaba la fila: la card del
  // mentor crecía y su valor quedaba a otra altura que las de horas. Ahora es
  // una sola línea con ellipsis, y el nombre completo sigue estando en el
  // title.
  texto?: boolean;
  // Lo que no entró en `valor`. Se muestra como "+N" al lado, y los nombres
  // quedan en su tooltip.
  resto?: string[];
}) {
  return (
    // Alturas fijas en el título y en el valor, no alturas derivadas del
    // contenido. Los títulos no miden lo mismo —"Hs estimadas de proyecto"
    // envuelve a dos líneas donde "Mentor Owner" usa una— y con el valor
    // pegado abajo, cada card lo arrancaba a una altura distinta. Reservando
    // las dos líneas siempre, el valor empieza en la misma linea horizontal en
    // las cinco.
    <div className={`${CARD} flex flex-col`}>
      <p className={KPI_ROTULO}>
        {titulo}
        {info && <InfoButton>{info}</InfoButton>}
      </p>
      {/* Centrado en una caja de alto fijo, y no alineado por línea base.
          Las cifras van en font-display -una tipografía de píxeles- y los
          nombres en la de texto: sus métricas no tienen nada que ver, así que
          apoyarlos en la misma base deja los nombres flotando visiblemente más
          arriba. Centrando cada uno en la misma caja, los centros ópticos
          coinciden y la fila se lee pareja, que es lo que se estaba pidiendo. */}
      <p
        style={color ? { color } : undefined}
        className={`mt-1 flex h-8 items-center ${color ? "" : "text-white"} ${
          texto ? "text-sm font-medium" : "font-display text-lg tabular-nums"
        }`}
      >
        {/* El tooltip pasó del <p> al texto: el contador de al lado tiene el
            suyo, y con los dos en el mismo elemento se pisaban. */}
        <span className="truncate" data-tooltip={valor}>
          {valor}
        </span>
        {/* shrink-0: es lo único que garantiza que el contador se vea. Sin eso
            se encoge junto al texto y con nombres largos desaparecía justo
            cuando hacía falta -que es cuando no entran-. */}
        {resto && resto.length > 0 && (
          <span
            className="ml-1.5 shrink-0 rounded-full bg-dc-peri/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-dc-peri"
            data-tooltip={`${resto.length} más: ${resto.join(", ")}`}
            aria-label={`${resto.length} más: ${resto.join(", ")}`}
          >
            +{resto.length}
          </span>
        )}
      </p>
    </div>
  );
}
