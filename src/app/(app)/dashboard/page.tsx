import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosConRol } from "@/lib/proyecto-acceso";
import { resolverScope } from "@/lib/scope";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { tareasVivas } from "@/lib/roadmap-papelera";
import { formatHorasHsMin } from "@/lib/horas";
import { construirCurvaHoras } from "@/lib/curva-horas";
import { hoyISO, semanaActualISO } from "@/lib/formato";
import { esMesActual } from "@/lib/mes";
import { InfoButton } from "@/components/info-button";
import { Kpi, GRID_KPIS } from "@/components/kpi";
import { CurvaHoras } from "@/components/curva-horas";
import { SemaforoEvolucion, NIVEL_SEMAFORO } from "@/components/semaforo-evolucion";
import { lunesDe } from "@/lib/curva-horas";
import { DIA_MS } from "@/lib/dias-habiles";
import { FiltrosModulo } from "@/components/filtros-modulo";
import { MODULOS } from "@/lib/modulos";
import { EstadoProyectos } from "./estado-proyectos";
import { EtapasProximas, type EtapaProxima } from "./etapas-proximas";
import { BloqueRecalculable, RecalculoProvider, ZonaRecalculable } from "./recalculo";

const CARD = "rounded-2xl border border-dc-line bg-dc-card";

// Home de CORE: el panorama del portafolio del usuario. Un mentor ve los
// proyectos donde está asignado como Owner o Backup; un admin, todos.
//
// Un único scope -mes, proyectos y Mentor Owner- gobierna KPIs, cards y
// gráficos. Todo lo de abajo se arma con `scope.ids` y con nada más, así que
// un componente nuevo hereda los filtros con solo recibir esa lista.
export default async function DashboardPage({
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

  if (usuario.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;

  const hoy = hoyISO();

  // El scope de la pantalla: el mes, los proyectos elegidos y el Mentor Owner
  // elegido, resueltos en un solo lugar. De acá salen `ids` -los proyectos que
  // sobreviven a todos los filtros- y de esa lista comen los KPIs, las cards y
  // los gráficos de abajo. Un componente nuevo que reciba `scope.ids` hereda
  // los filtros sin lógica propia.
  //
  // El alcance se lo pasa el Home: con el inicio del mes, porque sus KPIs
  // tienen que cuadrar con lo que se trabajó ese mes, incluidos los clientes
  // que se apagaron después.
  const scope = await resolverScope(params, (desde) =>
    getProyectosConRol(usuario.id, desde),
  );
  const { anio, mes, desde, hasta, ids, idsAccesibles } = scope;

  // "Próximas dos semanas" cuenta desde HOY, no desde el mes elegido. Parada
  // en un mes anterior estaría respondiendo una pregunta que nadie hizo, así
  // que se apaga y ni siquiera se consulta la base.
  const mesEnCurso = esMesActual({ anio, mes });

  const rangoFecha = {
    gte: new Date(desde + "T00:00:00Z"),
    lte: new Date(hasta + "T00:00:00Z"),
  };

  // Ventana fija hacia adelante de "Próximas dos semanas". Se calcula acá
  // arriba porque su consulta se une al mismo lote que el resto.
  const hoyUtc = new Date(hoy + "T00:00:00Z");
  const en14dias = new Date(hoyUtc.getTime() + 14 * DIA_MS);

  // Todo en un solo lote. Son consultas independientes y contra una base
  // remota lo que se paga es la ida y vuelta, no el trabajo: en serie, cada
  // una esperaba a la anterior sin necesitarla.
  const [registros, tareas, plan, tareasProximas, eventosSemaforo, miembrosEquipo] =
    await Promise.all([
    // Sin filtro de usuario: el total incluye lo reportado por cualquiera.
    prisma.registroHoras.findMany({
      where: { clienteId: { in: ids }, ...SOLO_ACTIVOS, fecha: rangoFecha },
      select: { fecha: true, horas: true, usuarioId: true },
    }),
    // Las tareas entran al rango por su fecha de fin: es cuando se considera
    // entregado el presupuesto. Alimenta lo ENTREGADO y la curva, que son
    // magnitudes de flujo y por eso sí siguen al filtro.
    prisma.tareaRoadmap.findMany({
      where: { ...tareasVivas({ clienteId: { in: ids } }), fechaFin: rangoFecha },
      select: { horasEstimadas: true, estado: true, fechaFin: true },
    }),
    // Lo ESTIMADO es el plan completo y no se filtra por fecha: es el tamaño
    // del compromiso, no algo que ocurra en un período. Con el filtro puesto
    // el número daba casi siempre 0 —el rango por defecto mira 90 días hacia
    // atrás y el Roadmap planifica hacia adelante— y encima significaba otra
    // cosa que el KPI del mismo nombre en el Home de Proyecto.
    prisma.tareaRoadmap.aggregate({
      where: tareasVivas({ clienteId: { in: ids } }),
      _sum: { horasEstimadas: true },
    }),
    // Etapas próximas: lo que arranca en los próximos 14 días y todavía no
    // empezó. No usa el rango del filtro —que mira hacia atrás— sino una
    // ventana fija hacia adelante: la pregunta es "qué se viene".
    mesEnCurso
      ? prisma.tareaRoadmap.findMany({
          where: {
            ...tareasVivas({ clienteId: { in: ids } }),
            estado: "sin_iniciar",
            fechaInicio: { gte: hoyUtc, lte: en14dias },
          },
          orderBy: { fechaInicio: "asc" },
          select: {
            id: true,
            nombre: true,
            fechaInicio: true,
            personas: true,
            lista: {
              select: { id: true, clienteId: true, cliente: { select: { nombre: true } } },
            },
          },
        })
      : Promise.resolve([]),
    // Evolución del semáforo: para cada semana vale el último evento ocurrido
    // hasta ella —incluidos los anteriores al rango, o el gráfico arrancaría
    // vacío aunque el proyecto ya tuviera un estado.
    prisma.semaforoEvento.findMany({
      where: { clienteId: { in: ids }, createdAt: { lte: rangoFecha.lte } },
      orderBy: { createdAt: "asc" },
      select: {
        clienteId: true,
        estado: true,
        createdAt: true,
        cliente: { select: { nombre: true } },
      },
    }),
    // Cumpleaños de la semana. La card está oculta detrás de
    // MODULOS.cumpleanos; mientras lo esté ni siquiera se consulta la base,
    // pero el cálculo queda intacto para cuando se reactive.
    MODULOS.cumpleanos
      ? prisma.miembroEquipo.findMany({
          where: { clienteId: { in: ids }, cumpleanos: { not: null } },
          include: { cliente: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
  ]);

  const presupuestadas = Number(plan._sum.horasEstimadas ?? 0);
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

  const etapasProximas: EtapaProxima[] = tareasProximas.map((t) => ({
    id: t.id,
    clienteId: t.lista.clienteId,
    listaId: t.lista.id,
    proyecto: t.lista.cliente.nombre,
    tarea: t.nombre,
    fecha: `${String(t.fechaInicio.getUTCDate()).padStart(2, "0")}/${String(
      t.fechaInicio.getUTCMonth() + 1,
    ).padStart(2, "0")}`,
    diasRestantes: Math.round(
      (t.fechaInicio.getTime() - hoyUtc.getTime()) / DIA_MS,
    ),
    personas: t.personas,
  }));


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

  // Cumpleaños de la semana (lunes a domingo), acotado a los proyectos
  // visibles.
  const semana = semanaActualISO();
  const diasSemanaMD = new Set(semana.map((iso) => iso.slice(5))); // "MM-DD"
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
    //
    // El provider envuelve a los dos lados: el filtro dispara la navegación y
    // la zona de abajo se atenúa mientras el servidor recalcula.
    <RecalculoProvider>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl uppercase text-white">
          Hola, {usuario.nombre.split(" ")[0]}
        </h1>
        <FiltrosModulo
          basePath="/dashboard"
          anio={anio}
          mes={mes}
          proyectosOpciones={scope.proyectosOpciones}
          proyectosSeleccionados={scope.proyectosSeleccionados}
          ownersOpciones={scope.ownersOpciones}
          ownersSeleccionados={scope.ownersSeleccionados}
        />
      </div>

      {idsAccesibles.length === 0 ? (
        <p className={`${CARD} mt-6 px-5 py-8 text-center text-sm text-dc-muted`}>
          {usuario.rol === "admin"
            ? "No hay proyectos activos. Creá uno desde Settings → Clientes."
            : "No estás asignado como Mentor Owner ni Backup en ningún proyecto. Un admin puede asignarlos desde Settings → Usuarios."}
        </p>
      ) : (
        // El eje horizontal va declarado. Un contenedor que pide `overflow-y`
        // y deja el otro eje sin declarar NO se queda en `visible`: la regla
        // de CSS computa el par y lo pasa a `auto`. Es decir que este bloque
        // era un contenedor de scroll horizontal sin que nadie lo pidiera, y
        // cualquier cosa que se pasara de ancho por dentro lo volvía
        // arrastrable de costado. Que el layout de arriba tenga
        // overflow-x-hidden no alcanzaba: el scroll pasaba acá adentro.
        //
        // (`clip` sería mejor —no se puede desplazar ni por programa— pero
        // junto a un `overflow-y: auto` el navegador lo degrada a `hidden`,
        // así que se escribe hidden y no se promete otra cosa.)
        <ZonaRecalculable className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pb-2">
          {/* Cada KPI avisa por su cuenta que está recalculando: el filtro no
              cambia todo, y un loader sobre la pantalla entera taparía
              justamente lo que hay que ver, que es cuáles números se mueven. */}
          <div className={GRID_KPIS}>
            <Kpi
              etiqueta="Hs estimadas de proyectos"
              valor={formatHorasHsMin(presupuestadas)}
              info="Suma de horas estimadas de todas las tareas. Es el plan completo de los proyectos elegidos: el filtro de fechas no lo mueve."
            />
            <Kpi
              etiqueta="Hs estimadas entregadas"
              valor={formatHorasHsMin(entregadas)}
              info="Suma de horas estimadas de todas las tareas con estado Finalizado, tomando las que terminan dentro del rango elegido."
            />
            <Kpi
              etiqueta="Hs Time Tracker Total"
              valor={formatHorasHsMin(horasTotal)}
            />
            <Kpi
              etiqueta="Hs Time Tracker Usuario"
              valor={formatHorasHsMin(horasUsuario)}
              destacado
            />
          </div>

          {/* Fila superior: el estado del portafolio a la izquierda y, a la
              derecha, la agenda. min-w-0 en las dos columnas: sin eso una
              celda larga estira su track y aparece scroll horizontal de
              pantalla en vez de recortarse dentro de la card. */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <BloqueRecalculable
              className="flex h-[30rem] min-w-0 flex-col"
              claseContenido="flex min-h-0 flex-1 flex-col"
            >
              <EstadoProyectos clienteIds={ids} />
            </BloqueRecalculable>
            {/* Con Cumpleaños oculto, Etapas próximas ocupa la columna
                entera; al reactivarlo vuelven las dos filas de siempre. */}
            <div
              className={`grid min-w-0 gap-4 lg:h-[30rem] ${
                MODULOS.cumpleanos
                  ? "lg:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]"
                  : "lg:grid-rows-1"
              }`}
            >
              {MODULOS.cumpleanos && (
              // min-w-0 por lo mismo que Próximas dos semanas: es un grid item
              // y sin esto no baja de su ancho mínimo de contenido.
              <div className="flex max-h-64 min-h-0 min-w-0 flex-col rounded-2xl border border-dc-line bg-dc-card p-5 lg:max-h-none">
                <h2 className="mb-3 shrink-0 text-base font-semibold text-white">
                  Cumpleaños de la semana
                </h2>
                {cumpleanosSemana.length === 0 ? (
                  <p className="text-sm text-dc-muted">No hay cumpleaños esta semana.</p>
                ) : (
                  <ul className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto overflow-x-hidden">
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
              )}

              {/* Envuelta como el resto de los bloques que dependen del
                  filtro: al cambiar los proyectos elegidos también se
                  recalcula, y hasta ahora era la única card que se quedaba
                  quieta mientras las demás avisaban. La cadena de alto se
                  continúa en el envoltorio interno, si no la lista con su
                  overflow pierde el límite y se desborda de la card. */}
              <BloqueRecalculable
                className="flex min-h-0 min-w-0 flex-col"
                claseContenido="flex min-h-0 flex-1 flex-col"
              >
                <EtapasProximas
                  etapas={etapasProximas}
                  activa={mesEnCurso}
                  hasta={`${String(en14dias.getUTCDate()).padStart(2, "0")}/${String(
                    en14dias.getUTCMonth() + 1,
                  ).padStart(2, "0")}`}
                />
              </BloqueRecalculable>
            </div>
          </div>

          {/* Debajo, los dos gráficos, uno por fila. */}
          <BloqueRecalculable>
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
          </BloqueRecalculable>

          <BloqueRecalculable>
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
          </BloqueRecalculable>
        </ZonaRecalculable>
      )}
    </div>
    </RecalculoProvider>
  );
}
