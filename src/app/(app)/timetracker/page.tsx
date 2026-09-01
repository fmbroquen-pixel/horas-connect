import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { getProyectosDelPeriodo } from "@/lib/proyectos";
import {
  getUsuariosQueReportan,
  resolverUsuarioDestino,
} from "@/lib/registrar-para";
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
import { SelectorUsuario } from "@/components/selector-usuario";
import type { MapaTarifas, RegistroFila } from "./tipos";

export default async function TimetrackerPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    mes?: string;
    proyectos?: string;
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
  // Dos alcances distintos y a proposito. `proyectos` es historia: alimenta el
  // filtro y la tabla del mes que se esta mirando, asi que incluye a los
  // clientes que operaban entonces aunque hoy esten inactivos. `paraCargar` es
  // el selector de la barra de captura, donde un inactivo no tiene que estar.
  const proyectos = await getProyectosDelPeriodo(destino.id, desde);
  const paraCargar = await getProyectosPermitidos(destino.id);
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

  const [conceptos, tarifasDelUsuario, registros, usuariosQueReportan] =
    await Promise.all([
      // Catálogo de conceptos (Settings → Conceptos): clasifica en qué se
      // consumieron las horas, así que no depende del cliente elegido.
      getConceptosActivos(),
      // Historial completo: el total en vivo se calcula con la tarifa de la
      // fecha que se esté cargando, no con la de hoy.
      prisma.tarifa.findMany({ where: { usuarioId: destino.id } }),
      prisma.registroHoras.findMany({
        where: {
          usuarioId: destino.id,
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
        },
      }),
      esAdmin ? getUsuariosQueReportan() : Promise.resolve([]),
    ]);

  const tarifas: MapaTarifas = {};
  for (const t of tarifasDelUsuario) {
    const k = `${t.modalidad}-${t.ownership}`;
    (tarifas[k] ??= []).push({
      valorUsd: Number(t.valorUsd),
      vigenteDesde: t.vigenteDesde,
      vigenteHasta: t.vigenteHasta,
    });
  }

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
      conceptoId: r.conceptoId ?? "",
      conceptoNombre: r.concepto?.nombre ?? r.etapa?.etiqueta ?? "—",
      ownership: r.ownership as "owner" | "backup",
      modalidad: r.modalidad as "presencial" | "virtual",
      horas: formatHorasHsMin(Number(r.horas)),
      tarifaUsd: Number(r.tarifaUsdAplicada),
      montoUsd: Number(r.montoUsd),
      edicion: marcaDeEdicion(r.editadoPor, r.updatedAt),
    }));

  const sinTarifa = Object.keys(tarifas).length === 0;
  // Sin proyectos asignados no hay nada contra qué cargar: se avisa y se
  // esconde la barra, en vez de dejar un desplegable de clientes vacío que
  // solo falla al guardar.
  const sinProyectos = proyectos.length === 0;
  const esOtroUsuario = destino.id !== actor.id;

  // El filtro y la tabla muestran el periodo; la barra de captura, solo donde
  // se puede cargar hoy.
  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const opcionesCarga = paraCargar.map((p) => ({ id: p.id, nombre: p.nombre }));

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
          {/* Mes + proyectos, el mismo componente que el Home. */}
          <FiltrosMesRecalculo
            anio={anio}
            mes={mes}
            basePath="/timetracker"
            opciones={opcionesProyecto}
            seleccionados={idsFiltro}
            extra={{ usuario: params.usuario }}
          />
          {!sinTarifa && (
            <AccionesMenu
              anio={anio}
              mes={mes}
              proyectosOpciones={opcionesProyecto}
              proyectosSeleccionados={idsFiltro}
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
            proyectos={opcionesCarga}
            conceptos={conceptos}
            tarifas={tarifas}
            usuarioId={esOtroUsuario ? destino.id : ""}
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
        {/* key por usuario: limpia la selección múltiple al cambiar de mentor. */}
        <TablaRegistros
          key={destino.id}
          filas={filas}
          proyectos={opcionesProyecto}
          conceptos={conceptos}
        />
      </BloqueRecalculable>
    </div>
    </RecalculoProvider>
  );
}
