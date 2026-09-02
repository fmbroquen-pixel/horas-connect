import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { getProyectosDelPeriodo } from "@/lib/proyectos";
import {
  getTarifasPorUsuario,
  getUsuariosVisibles,
  idsUsuariosDelFiltro,
} from "@/lib/usuarios-tt";
import { getConceptosActivos } from "@/lib/conceptos";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { formatHorasHsMin } from "@/lib/horas";

import { marcaDeEdicion } from "@/lib/edicion";
import { mesDeParams, rangoDelMes } from "@/lib/mes";
import { FiltrosMesRecalculo } from "@/components/filtros-mes-recalculo";
import { RecalculoProvider, BloqueRecalculable } from "@/components/recalculo";
import { InfoButton } from "@/components/info-button";
import { TablaRegistros } from "./tabla-registros";
import { AccionesMenu } from "./acciones-menu";
import { BarraCaptura } from "./barra-captura";
import type { MapaTarifas, RegistroFila } from "./tipos";

// Une las listas de proyectos de varios usuarios sin repetir. Dos mentores
// comparten clientes seguido, y el filtro tiene que ofrecer cada uno una vez.
function unicosPorId<T extends { id: string }>(items: T[]): T[] {
  const vistos = new Map<string, T>();
  for (const i of items) if (!vistos.has(i.id)) vistos.set(i.id, i);
  return [...vistos.values()].sort((a, b) =>
    (a as { nombre?: string }).nombre?.localeCompare(
      (b as { nombre?: string }).nombre ?? "",
    ) ?? 0,
  );
}

export default async function TimetrackerPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    mes?: string;
    proyectos?: string;
    usuarios?: string;
  }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario: actor } = sesion;
  if (actor.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;
  // El período es un mes, igual que en Analytics. El mes en curso se corta
  // en hoy; los anteriores van completos.
  const { anio, mes } = mesDeParams(params.anio, params.mes);
  const { desde, hasta } = rangoDelMes(anio, mes);

  const esAdmin = actor.rol === "admin";

  // Quiénes se ven en esta pantalla. El admin ve a todos los que reportan; un
  // mentor, solo a sí mismo. Antes había un selector global que ponía la
  // pantalla entera en los zapatos de UN usuario: el dueño de las horas
  // siempre estuvo en cada registro, y ese selector obligaba a mirar un mentor
  // por vez y a importar un archivo por mentor.
  const visibles = await getUsuariosVisibles(actor);
  const idsUsuarios = idsUsuariosDelFiltro(visibles, params.usuarios);

  // Todo el contexto de la pantalla (clientes, tarifa e historial) es el del
  // usuario destino: si el admin carga para otro, ve exactamente lo que ese
  // mentor vería.
  // Dos alcances distintos y a proposito. `proyectos` es historia: alimenta el
  // filtro y la tabla del mes que se esta mirando, asi que incluye a los
  // clientes que operaban entonces aunque hoy esten inactivos. `paraCargar` es
  // el selector de la barra de captura, donde un inactivo no tiene que estar.
  // Los proyectos de TODOS los usuarios visibles, no los de uno solo: la tabla
  // ahora mezcla mentores y su filtro de clientes tiene que cubrirlos a todos.
  const proyectosPorUsuario = await Promise.all(
    visibles.map(async (u) => ({
      usuarioId: u.id,
      historia: await getProyectosDelPeriodo(u.id, desde),
      paraCargar: await getProyectosPermitidos(u.id),
    })),
  );
  const proyectos = unicosPorId(proyectosPorUsuario.flatMap((x) => x.historia));
  // Lo que puede cargar CADA uno, por separado: el desplegable de la barra
  // depende de quién sea el dueño de la fila que se está escribiendo.
  const cargaPorUsuario = Object.fromEntries(
    proyectosPorUsuario.map((x) => [
      x.usuarioId,
      x.paraCargar.map((p) => ({ id: p.id, nombre: p.nombre })),
    ]),
  );
  // Sin parámetro se muestran todos los permitidos; con parámetro, solo los
  // pedidos que además lo sean (un id ajeno en la URL no abre nada).
  const idsPermitidos = proyectos.map((p) => p.id);
  const pedidos = (params.proyectos ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const idsFiltro =
    pedidos.length > 0
      ? pedidos.filter((id) => idsPermitidos.includes(id))
      : idsPermitidos;

  const [conceptos, tarifasPorUsuario, registros] =
    await Promise.all([
      // Catálogo de conceptos (Settings → Conceptos): clasifica en qué se
      // consumieron las horas, así que no depende del cliente elegido.
      getConceptosActivos(),
      // Historial completo: el total en vivo se calcula con la tarifa de la
      // fecha que se esté cargando, no con la de hoy.
      getTarifasPorUsuario(visibles.map((u) => u.id)),
      prisma.registroHoras.findMany({
        where: {
          usuarioId: { in: idsUsuarios },
          ...SOLO_ACTIVOS,
          fecha: {
            gte: new Date(desde + "T00:00:00Z"),
            lte: new Date(hasta + "T00:00:00Z"),
          },
          clienteId: { in: idsFiltro },
        },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        take: 500,
        include: {
          concepto: { select: { nombre: true } },
          etapa: { select: { etiqueta: true } },
          editadoPor: { select: { nombre: true } },
          usuario: { select: { nombre: true } },
        },
      }),
    ]);

  // La tarifa del propio actor: es la que se usa por defecto en la barra, y la
  // que decide si puede cargar para sí mismo.
  const tarifas: MapaTarifas = tarifasPorUsuario[actor.id] ?? {};

  // Mismo corte que valida el servidor al guardar, del mismo helper: si se
  // calculara acá aparte, la tabla podría mostrar como editable una fila que

  // Etiqueta de la columna Concepto: el nombre guardado, aunque el concepto
  // esté dado de baja y ya no figure en el desplegable. Si el registro es
  // anterior al catálogo se cae a su clasificación previa, para que el
  // historial no quede en blanco.

  const activoPorCliente = new Map(proyectos.map((p) => [p.id, p.activo]));
  const filas: RegistroFila[] = registros
    .filter((r) => r.ownership !== "valor_cero")
    .map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString().slice(0, 10),
      clienteId: r.clienteId,
      clienteActivo: activoPorCliente.get(r.clienteId) ?? true,
      usuarioNombre: r.usuario.nombre,
      conceptoId: r.conceptoId ?? "",
      conceptoNombre: r.concepto?.nombre ?? r.etapa?.etiqueta ?? "—",
      ownership: r.ownership as "owner" | "backup",
      modalidad: r.modalidad as "presencial" | "virtual",
      horas: formatHorasHsMin(Number(r.horas)),
      tarifaUsd: Number(r.tarifaUsdAplicada),
      montoUsd: Number(r.montoUsd),
      edicion: marcaDeEdicion(r.editadoPor, r.updatedAt),
    }));

  // Para quiénes se puede cargar de verdad: hace falta tarifa Y algún proyecto
  // asignado. Un admin sin tarifa propia igual puede cargarle a un mentor que
  // sí la tenga, cosa que antes no se podía: el aviso apagaba la barra entera.
  const puedenRecibirCarga = visibles
    .filter(
      (u) =>
        // Bloqueado: sus horas se siguen viendo en la tabla, pero no recibe
        // ninguna nueva. El servidor lo rechaza igual.
        u.activo &&
        Object.keys(tarifasPorUsuario[u.id] ?? {}).length > 0 &&
        (cargaPorUsuario[u.id] ?? []).length > 0,
    )
    .map((u) => ({ id: u.id, nombre: u.nombre }));

  // El motivo por el que el actor no puede cargarse horas a sí mismo, si es
  // que no puede. Se sigue avisando —era información útil— pero ya no decide
  // si la barra existe.
  const sinTarifaPropia = Object.keys(tarifas).length === 0;
  const sinProyectosPropios = (cargaPorUsuario[actor.id] ?? []).length === 0;

  // El filtro y la tabla muestran el periodo; la barra de captura, solo donde
  // se puede cargar hoy.
  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const opcionesUsuario = visibles.map((u) => ({ id: u.id, nombre: u.nombre }));

  return (
    // El provider envuelve a los dos lados: el selector de mes dispara la
    // navegacion y la tabla se atenua mientras el servidor recalcula.
    <RecalculoProvider>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Time Tracking</h1>
        <InfoButton>
          Cargá las horas como número decimal (por ejemplo 1,5 o 1.5) y se
          muestran como 1:30. Se pueden cargar y corregir registros de los No se admiten fechas futuras.
        </InfoButton>
      </div>

      {sinTarifaPropia && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          Todavía no tenés una tarifa configurada, así que no podés cargarte
          horas a vos. Pedile al administrador que la configure.
        </p>
      )}

      {!sinTarifaPropia && sinProyectosPropios && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          Todavía no tenés proyectos asignados, así que no podés cargarte horas
          a vos. Pedile a un administrador que te asigne los tuyos.
        </p>
      )}

      {/* Acciones del historial: el filtro (mes, proyectos y usuarios) y el
          menú de importar/exportar. El selector global "Registrar horas para"
          se fue: el dueño ahora se elige por fila. */}
      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          {/* Mes + proyectos, el mismo componente que el Home. */}
          <FiltrosMesRecalculo
            anio={anio}
            mes={mes}
            basePath="/timetracker"
            opciones={opcionesProyecto}
            seleccionados={idsFiltro}
            extra={{ usuarios: params.usuarios }}
          />
          <AccionesMenu
            anio={anio}
            mes={mes}
            proyectosOpciones={opcionesProyecto}
            proyectosSeleccionados={idsFiltro}
            usuariosOpciones={esAdmin ? opcionesUsuario : []}
            usuariosSeleccionados={idsUsuarios}
          />
        </div>
      </div>

      {/* Barra de captura permanente, inmediatamente encima del historial.
          Aparece si hay ALGUIEN a quien cargarle: un admin sin tarifa propia
          igual puede cargarle a un mentor que sí la tenga. */}
      {puedenRecibirCarga.length > 0 && (
        <div className="mt-4">
          <BarraCaptura
            usuarios={puedenRecibirCarga}
            usuarioPorDefecto={
              puedenRecibirCarga.some((u) => u.id === actor.id)
                ? actor.id
                : puedenRecibirCarga[0].id
            }
            puedeElegirUsuario={esAdmin}
            proyectosPorUsuario={cargaPorUsuario}
            conceptos={conceptos}
            tarifasPorUsuario={tarifasPorUsuario}
          />
        </div>
      )}

      {/* Solo la tabla depende del mes: la barra de captura de arriba no, y
          apagarla tambien haria parecer que se perdio lo que se esta
          escribiendo. La cadena de alto se continua en el envoltorio interno,
          si no la tabla con su scroll pierde el limite. */}
      <BloqueRecalculable
        className="mt-3 flex min-h-0 flex-1 flex-col"
        claseContenido="flex min-h-0 flex-1 flex-col"
      >
        <TablaRegistros
          filas={filas}
          proyectos={opcionesProyecto}
          conceptos={conceptos}
        />
      </BloqueRecalculable>
    </div>
    </RecalculoProvider>
  );
}
