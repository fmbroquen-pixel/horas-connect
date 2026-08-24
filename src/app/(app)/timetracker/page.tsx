import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import {
  getUsuariosQueReportan,
  resolverUsuarioDestino,
} from "@/lib/registrar-para";
import { getConceptosActivos } from "@/lib/conceptos";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { formatHorasHsMin } from "@/lib/horas";
import { hoyISO } from "@/lib/formato";
import { mesDeParams, rangoDelMes } from "@/lib/mes";
import { SelectorMes } from "@/components/selector-mes";
import { FiltroPopover } from "@/components/filtro-popover";
import { InfoButton } from "@/components/info-button";
import { TablaRegistros } from "./tabla-registros";
import { AccionesMenu } from "./acciones-menu";
import { BarraCaptura } from "./barra-captura";
import { SelectorUsuario } from "@/components/selector-usuario";
import type { MapaTarifas, RegistroFila } from "./tipos";

export default async function TimetrackerPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    mes?: string;
    proyecto?: string;
    usuario?: string;
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

  // Usuario dueño de las horas. Solo un admin puede elegir otro; para el
  // resto resolverUsuarioDestino devuelve siempre el propio actor (y si el
  // param es inválido, se cae al actor sin romper la pantalla).
  const destinoRes = await resolverUsuarioDestino(actor, params.usuario);
  const destino = destinoRes.ok ? destinoRes.destino : actor;

  // Todo el contexto de la pantalla (clientes, tarifa e historial) es el del
  // usuario destino: si el admin carga para otro, ve exactamente lo que ese
  // mentor vería.
  const proyectos = await getProyectosPermitidos(destino.id);
  const proyectoId = proyectos.some((p) => p.id === params.proyecto)
    ? params.proyecto
    : undefined;

  const [conceptos, tarifasVigentes, registros, usuariosQueReportan] =
    await Promise.all([
      // Catálogo de conceptos (Settings → Conceptos): clasifica en qué se
      // consumieron las horas, así que no depende del cliente elegido.
      getConceptosActivos(),
      prisma.tarifa.findMany({
        where: { usuarioId: destino.id, vigenteHasta: null },
      }),
      prisma.registroHoras.findMany({
        where: {
          usuarioId: destino.id,
          ...SOLO_ACTIVOS,
          fecha: {
            gte: new Date(desde + "T00:00:00Z"),
            lte: new Date(hasta + "T00:00:00Z"),
          },
          ...(proyectoId ? { clienteId: proyectoId } : {}),
        },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        take: 500,
        include: {
          concepto: { select: { nombre: true } },
          etapa: { select: { etiqueta: true } },
        },
      }),
      esAdmin ? getUsuariosQueReportan() : Promise.resolve([]),
    ]);

  const tarifas: MapaTarifas = {};
  for (const t of tarifasVigentes) {
    tarifas[`${t.modalidad}-${t.ownership}`] = Number(t.valorUsd);
  }

  // Mismo corte que valida el servidor al guardar, del mismo helper: si se
  // calculara acá aparte, la tabla podría mostrar como editable una fila que

  // Etiqueta de la columna Concepto: el nombre guardado, aunque el concepto
  // esté dado de baja y ya no figure en el desplegable. Si el registro es
  // anterior al catálogo se cae a su clasificación previa, para que el
  // historial no quede en blanco.

  const filas: RegistroFila[] = registros
    .filter((r) => r.ownership !== "valor_cero")
    .map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString().slice(0, 10),
      clienteId: r.clienteId,
      conceptoId: r.conceptoId ?? "",
      conceptoNombre: r.concepto?.nombre ?? r.etapa?.etiqueta ?? "—",
      ownership: r.ownership as "owner" | "backup",
      modalidad: r.modalidad as "presencial" | "virtual",
      horas: formatHorasHsMin(Number(r.horas)),
      tarifaUsd: Number(r.tarifaUsdAplicada),
      montoUsd: Number(r.montoUsd),
    }));

  const sinTarifa = Object.keys(tarifas).length === 0;
  // Sin proyectos asignados no hay nada contra qué cargar: se avisa y se
  // esconde la barra, en vez de dejar un desplegable de clientes vacío que
  // solo falla al guardar.
  const sinProyectos = proyectos.length === 0;
  const esOtroUsuario = destino.id !== actor.id;

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Time Tracking</h1>
        <InfoButton>
          Cargá las horas como número decimal (por ejemplo 1,5 o 1.5) y se
          muestran como 1:30. Se pueden cargar y corregir registros de los No se admiten fechas futuras.
        </InfoButton>
      </div>

      {sinTarifa && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          {esOtroUsuario
            ? `${destino.nombre} no tiene una tarifa configurada, así que no se le pueden cargar horas.`
            : "Todavía no tenés una tarifa configurada, así que no podés cargar horas. Pedile al administrador que la configure."}
        </p>
      )}

      {!sinTarifa && sinProyectos && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          {esOtroUsuario
            ? `${destino.nombre} no tiene proyectos asignados, así que no se le pueden cargar horas.`
            : "Todavía no tenés proyectos asignados, así que no podés cargar horas. Pedile a un administrador que te asigne los tuyos."}
        </p>
      )}

      {/* Acciones del historial: selector de usuario (admin), consultar
          (filtro) e importar/exportar (⋮). */}
      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-between gap-2">
        {esAdmin ? (
          <SelectorUsuario
            etiqueta="Registrar horas para"
            usuarios={usuariosQueReportan.map((u) => ({ id: u.id, nombre: u.nombre }))}
            actual={destino.id}
            actorId={actor.id}
          />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {/* Período: un mes, con el mismo selector de Analytics. El filtro de
              proyecto queda aparte y sin fechas: un rango libre además del mes
              serían dos formas de decir lo mismo. */}
          <SelectorMes
            anio={anio}
            mes={mes}
            basePath="/timetracker"
            extra={{ proyecto: proyectoId, usuario: params.usuario }}
          />
          <FiltroPopover
            basePath="/timetracker"
            desde=""
            hasta=""
            sinFechas
            proyectoId={proyectoId ?? ""}
            proyectos={opcionesProyecto}
            maxHoy={hoyISO()}
          />
          {!sinTarifa && (
            <AccionesMenu
              desde={desde}
              hasta={hasta}
              proyecto={proyectoId ?? ""}
              usuarioId={esOtroUsuario ? destino.id : ""}
            />
          )}
        </div>
      </div>

      {/* Barra de captura permanente, inmediatamente encima del historial. */}
      {!sinTarifa && !sinProyectos && (
        <div className="mt-4">
          {/* key por usuario: al cambiar de mentor se remonta la barra y no
              quedan cargados el cliente ni la etapa del anterior. */}
          <BarraCaptura
            key={destino.id}
            proyectos={opcionesProyecto}
            conceptos={conceptos}
            tarifas={tarifas}
            usuarioId={esOtroUsuario ? destino.id : ""}
          />
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        {/* key por usuario: limpia la selección múltiple al cambiar de mentor. */}
        <TablaRegistros
          key={destino.id}
          filas={filas}
          proyectos={opcionesProyecto}
          conceptos={conceptos}
        />
      </div>
    </div>
  );
}
