import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { getProyectosDelPeriodo } from "@/lib/proyectos";
import { getUsuariosQueReportan, resolverUsuarioDestino } from "@/lib/registrar-para";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { fechaDesdeISO } from "@/lib/dias-habiles";
import { MODULOS } from "@/lib/modulos";

import { marcaDeEdicion } from "@/lib/edicion";
import { mesDeParams, rangoDelMes } from "@/lib/mes";
import { FiltrosMesRecalculo } from "@/components/filtros-mes-recalculo";
import { RecalculoProvider, BloqueRecalculable } from "@/components/recalculo";
import { createAdminClient, BUCKET_COMPROBANTES } from "@/lib/supabase/admin";
import { InfoButton } from "@/components/info-button";
import { SelectorUsuario } from "@/components/selector-usuario";
import { type ViaticoFila } from "./tipos";
import { BarraCapturaViatico } from "./barra-captura";
import { TablaViaticos } from "./tabla-viaticos";
import { AccionesViaticos } from "./menu-acciones";

// Expenses comparte el patrón de Time Tracking: selector de usuario (solo
// admin), barra de captura permanente arriba y el historial abajo con sus
// filtros y su scroll propio. Lo único distinto son los campos del módulo.
export default async function ViaticosPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    mes?: string;
    proyectos?: string;
    usuario?: string;
  }>;
}) {
  // Módulo detrás de flag: con expenses en false la ruta no responde aunque
  // se escriba la URL a mano, igual que Time Off.
  if (!MODULOS.expenses) notFound();

  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const actor = sesion.usuario;
  if (actor.rol === "reader") redirect("/rentabilidad");
  const esAdmin = actor.rol === "admin";

  const params = await searchParams;
  // El período es un mes, igual que en Analytics. El mes en curso se corta
  // en hoy; los anteriores van completos.
  const { anio, mes } = mesDeParams(params.anio, params.mes);
  const { desde, hasta } = rangoDelMes(anio, mes);

  // Dueño de los gastos. Solo un admin puede elegir otro; para el resto
  // resolverUsuarioDestino devuelve siempre el propio actor (y si el param es
  // inválido, se cae al actor sin romper la pantalla).
  const destinoRes = await resolverUsuarioDestino(actor, params.usuario, "viáticos");
  const destino = destinoRes.ok ? destinoRes.destino : actor;

  // Todo el contexto de la pantalla es el del usuario destino: si el admin
  // carga para otro, ve exactamente lo que esa persona vería.
  // Igual que Time Tracking: `proyectos` es el alcance historico -filtro y
  // tabla del mes- y `paraCargar` el del selector de alta.
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

  const [viaticos, usuariosQueReportan] = await Promise.all([
    prisma.viatico.findMany({
      where: {
        usuarioId: destino.id,
        ...SOLO_ACTIVOS,
        fecha: { gte: fechaDesdeISO(desde), lte: fechaDesdeISO(hasta) },
        clienteId: { in: idsFiltro },
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: { editadoPor: { select: { nombre: true } } },
    }),
    esAdmin ? getUsuariosQueReportan() : Promise.resolve([]),
  ]);

  // URLs firmadas (1 hora) para ver los comprobantes del bucket privado.
  const supabase = createAdminClient();
  const activoPorCliente = new Map(proyectos.map((p) => [p.id, p.activo]));
  const filas: ViaticoFila[] = await Promise.all(
    viaticos.map(async (v) => {
      let archivoUrl: string | null = null;
      if (v.archivoPath) {
        const { data } = await supabase.storage
          .from(BUCKET_COMPROBANTES)
          .createSignedUrl(v.archivoPath, 3600);
        archivoUrl = data?.signedUrl ?? null;
      }
      return {
        id: v.id,
        fecha: v.fecha.toISOString().slice(0, 10),
        clienteId: v.clienteId,
        clienteActivo: activoPorCliente.get(v.clienteId) ?? true,
        moneda: v.moneda,
        monto: Number(v.monto),
        concepto: v.concepto,
        archivoUrl,
        edicion: marcaDeEdicion(v.editadoPor, v.updatedAt),
      };
    }),
  );

  const opcionesProyecto = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const opcionesCarga = paraCargar.map((p) => ({ id: p.id, nombre: p.nombre }));
  const esOtroUsuario = destino.id !== actor.id;
  // Sin proyectos asignados no hay nada contra qué cargar: se avisa y se
  // esconde la barra, en vez de dejar un desplegable de clientes vacío que
  // solo falla al guardar.
  const sinProyectos = proyectos.length === 0;

  return (
    // El provider envuelve a los dos lados: el selector de mes dispara la
    // navegacion y la tabla se atenua mientras el servidor recalcula.
    <RecalculoProvider>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Expenses</h1>
        <InfoButton>
          Cargá los gastos asociados a un cliente. El comprobante es opcional y
          se guarda en un bucket privado: se ve con un enlace temporal desde la
          columna del clip.
        </InfoButton>
      </div>

      {sinProyectos && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          {esOtroUsuario
            ? `${destino.nombre} no tiene proyectos asignados, así que no se le pueden cargar viáticos.`
            : "Todavía no tenés proyectos asignados, así que no podés cargar viáticos. Pedile a un administrador que te asigne los tuyos."}
        </p>
      )}

      {/* Acciones del historial: selector de usuario (admin), consultar
          (filtro) y papelera. */}
      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-between gap-2">
        {esAdmin ? (
          <SelectorUsuario
            etiqueta="Registrar viático para"
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
            basePath="/viaticos"
            opciones={opcionesProyecto}
            seleccionados={idsFiltro}
            extra={{ usuario: params.usuario }}
          />
          <AccionesViaticos
            anio={anio}
            mes={mes}
            proyectosOpciones={opcionesProyecto}
            proyectosSeleccionados={idsFiltro}
            usuarioId={esOtroUsuario ? destino.id : ""}
          />
        </div>
      </div>

      {/* Barra de captura permanente, inmediatamente encima del historial. */}
      {!sinProyectos && (
        <div className="mt-4">
          {/* key por usuario: al cambiar de persona se remonta la barra y no
              queda cargado el cliente del anterior. */}
          <BarraCapturaViatico
            key={destino.id}
            proyectos={opcionesCarga}
            usuarioId={esOtroUsuario ? destino.id : ""}
          />
        </div>
      )}

      {/* Solo la tabla depende del mes: la barra de captura de arriba no. */}
      <BloqueRecalculable
        className="mt-3 flex min-h-0 flex-1 flex-col"
        claseContenido="flex min-h-0 flex-1 flex-col"
      >
      <TablaViaticos filas={filas} proyectos={opcionesProyecto} />
      </BloqueRecalculable>
    </div>
    </RecalculoProvider>
  );
}
