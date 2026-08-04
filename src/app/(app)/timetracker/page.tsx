import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import {
  getUsuariosQueReportan,
  resolverUsuarioDestino,
} from "@/lib/registrar-para";
import { getTareasPorCliente } from "@/lib/roadmap";
import { formatHorasHsMin } from "@/lib/horas";
import { hoyISO, rangoDefault30 } from "@/lib/formato";
import { FiltroPopover } from "@/components/filtro-popover";
import { InfoButton } from "@/components/info-button";
import { TablaRegistros } from "./tabla-registros";
import { AccionesMenu } from "./acciones-menu";
import { BarraCaptura } from "./barra-captura";
import { SelectorUsuario } from "./selector-usuario";
import { DIAS_VENTANA_EDICION } from "./constantes";
import type { MapaTarifas, RegistroFila } from "./tipos";

export default async function TimetrackerPage({
  searchParams,
}: {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    proyecto?: string;
    usuario?: string;
  }>;
}) {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario: actor } = sesion;
  if (actor.rol === "reader") redirect("/rentabilidad");

  const params = await searchParams;
  // Por defecto, últimos 30 días.
  const { desde, hasta } = rangoDefault30(params.desde, params.hasta);

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

  const [tareasPorCliente, tarifasVigentes, registros, usuariosQueReportan] =
    await Promise.all([
      // Las tareas del Roadmap de cada cliente permitido: el desplegable de
      // Tarea se arma con las del cliente que se elija.
      getTareasPorCliente(proyectos.map((p) => p.id)),
      prisma.tarifa.findMany({
        where: { usuarioId: destino.id, vigenteHasta: null },
      }),
      prisma.registroHoras.findMany({
        where: {
          usuarioId: destino.id,
          eliminadoEn: null,
          fecha: {
            gte: new Date(desde + "T00:00:00Z"),
            lte: new Date(hasta + "T00:00:00Z"),
          },
          ...(proyectoId ? { clienteId: proyectoId } : {}),
        },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        take: 500,
        include: { etapa: { select: { etiqueta: true } } },
      }),
      esAdmin ? getUsuariosQueReportan() : Promise.resolve([]),
    ]);

  const tarifas: MapaTarifas = {};
  for (const t of tarifasVigentes) {
    tarifas[`${t.modalidad}-${t.ownership}`] = Number(t.valorUsd);
  }

  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_VENTANA_EDICION);
  limite.setHours(0, 0, 0, 0);

  // Etiqueta a mostrar en la columna Tarea. Si el registro ya está imputado a
  // una tarea del Roadmap se usa su nombre; si es anterior al Roadmap, se
  // muestra la etapa vieja para que el historial no quede en blanco.
  const nombreTarea = (clienteId: string, tareaId: string | null, etapa?: string) => {
    if (tareaId) {
      const opcion = tareasPorCliente[clienteId]?.find((t) => t.id === tareaId);
      if (opcion) return opcion.nombre;
    }
    return etapa ?? "—";
  };

  const filas: RegistroFila[] = registros
    .filter((r) => r.ownership !== "valor_cero")
    .map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString().slice(0, 10),
      clienteId: r.clienteId,
      tareaId: r.tareaId ?? "",
      tareaNombre: nombreTarea(r.clienteId, r.tareaId, r.etapa?.etiqueta),
      ownership: r.ownership as "owner" | "backup",
      modalidad: r.modalidad as "presencial" | "virtual",
      horas: formatHorasHsMin(Number(r.horas)),
      tarifaUsd: Number(r.tarifaUsdAplicada),
      montoUsd: Number(r.montoUsd),
      editable: r.fecha >= limite,
    }));

  const sinTarifa = Object.keys(tarifas).length === 0;
  const esOtroUsuario = destino.id !== actor.id;

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Time Tracking</h1>
        <InfoButton>
          Cargá las horas como número decimal (por ejemplo 1,5 o 1.5) y se
          muestran como 1:30. Se pueden cargar y corregir registros de los
          últimos {DIAS_VENTANA_EDICION} días; no se admiten fechas futuras.
        </InfoButton>
      </div>

      {sinTarifa && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          {esOtroUsuario
            ? `${destino.nombre} no tiene una tarifa configurada, así que no se le pueden cargar horas.`
            : "Todavía no tenés una tarifa configurada, así que no podés cargar horas. Pedile al administrador que la configure."}
        </p>
      )}

      {/* Acciones del historial: selector de usuario (admin), consultar
          (filtro) e importar/exportar (⋮). */}
      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-between gap-2">
        {esAdmin ? (
          <SelectorUsuario
            usuarios={usuariosQueReportan.map((u) => ({ id: u.id, nombre: u.nombre }))}
            actual={destino.id}
            actorId={actor.id}
          />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <FiltroPopover
            basePath="/timetracker"
            desde={desde}
            hasta={hasta}
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
      {!sinTarifa && (
        <div className="mt-4">
          {/* key por usuario: al cambiar de mentor se remonta la barra y no
              quedan cargados el cliente ni la etapa del anterior. */}
          <BarraCaptura
            key={destino.id}
            proyectos={opcionesProyecto}
            tareasPorCliente={tareasPorCliente}
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
          tareasPorCliente={tareasPorCliente}
        />
      </div>
    </div>
  );
}
