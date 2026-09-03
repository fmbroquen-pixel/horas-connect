import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getProyectosPermitidos } from "@/lib/require-guest";
import { getProyectosDelPeriodo } from "@/lib/proyectos";
import { getUsuariosVisibles, idsUsuariosDelFiltro } from "@/lib/usuarios-tt";
import { SOLO_ACTIVOS } from "@/lib/registros-horas";
import { fechaDesdeISO } from "@/lib/dias-habiles";
import { MODULOS } from "@/lib/modulos";

import { marcaDeEdicion } from "@/lib/edicion";
import { mesDeParams, rangoDelMes } from "@/lib/mes";
import { FiltrosMesRecalculo } from "@/components/filtros-mes-recalculo";
import { RecalculoProvider, BloqueRecalculable } from "@/components/recalculo";
import { createAdminClient, BUCKET_COMPROBANTES } from "@/lib/supabase/admin";
import { InfoButton } from "@/components/info-button";
import { type ViaticoFila } from "./tipos";
import { BarraCapturaViatico } from "./barra-captura";
import { TablaViaticos } from "./tabla-viaticos";
import { AccionesViaticos } from "./menu-acciones";

// Expenses comparte el patrón de Time Tracking: selector de usuario (solo
// admin), barra de captura permanente arriba y el historial abajo con sus
// filtros y su scroll propio. Lo único distinto son los campos del módulo.
// Une las listas de proyectos de varios usuarios sin repetir. Dos personas
// comparten clientes seguido y el filtro tiene que ofrecer cada uno una vez.
function unicosPorId<T extends { id: string; nombre: string }>(items: T[]): T[] {
  const vistos = new Map<string, T>();
  for (const i of items) if (!vistos.has(i.id)) vistos.set(i.id, i);
  return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export default async function ViaticosPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    mes?: string;
    proyectos?: string;
    usuarios?: string;
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

  // Quiénes se ven en esta pantalla. Mismo criterio que Time Tracking: el admin
  // ve a todos los que reportan; un mentor, solo a sí mismo. El dueño del gasto
  // siempre estuvo en cada registro; el selector global obligaba a mirar de a
  // una persona.
  const visibles = await getUsuariosVisibles(actor);
  const idsUsuarios = idsUsuariosDelFiltro(visibles, params.usuarios);

  // Los proyectos de TODOS los visibles: la tabla mezcla personas y su filtro
  // de clientes tiene que cubrirlas a todas. `paraCargar` va por usuario porque
  // el desplegable del alta depende de quién sea el dueño de la fila.
  const proyectosPorUsuario = await Promise.all(
    visibles.map(async (u) => ({
      usuarioId: u.id,
      historia: await getProyectosDelPeriodo(u.id, desde),
      paraCargar: await getProyectosPermitidos(u.id),
    })),
  );
  const proyectos = unicosPorId(proyectosPorUsuario.flatMap((x) => x.historia));
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

  const [viaticos] = await Promise.all([
    prisma.viatico.findMany({
      where: {
        usuarioId: { in: idsUsuarios },
        ...SOLO_ACTIVOS,
        fecha: { gte: fechaDesdeISO(desde), lte: fechaDesdeISO(hasta) },
        clienteId: { in: idsFiltro },
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        editadoPor: { select: { nombre: true } },
        usuario: { select: { nombre: true, activo: true } },
      },
    }),
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
        usuarioId: v.usuarioId,
        usuarioNombre: v.usuario.nombre,
        usuarioActivo: v.usuario.activo,
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
  const opcionesUsuario = visibles.map((u) => ({ id: u.id, nombre: u.nombre }));

  // Para quiénes se puede cargar de verdad. Un admin sin proyectos propios
  // igual puede cargarle a alguien que sí los tenga, cosa que antes no podía:
  // el aviso apagaba la barra entera.
  const puedenRecibirCarga = visibles
    .filter((u) => (cargaPorUsuario[u.id] ?? []).length > 0)
    .map((u) => ({ id: u.id, nombre: u.nombre }));
  const sinProyectosPropios = (cargaPorUsuario[actor.id] ?? []).length === 0;

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

      {sinProyectosPropios && (
        <p className="mt-4 shrink-0 rounded-xl border border-dc-pink/40 bg-dc-pink/10 px-4 py-3 text-sm text-dc-pink">
          Todavía no tenés proyectos asignados, así que no podés cargarte
          viáticos a vos. Pedile a un administrador que te asigne los tuyos.
        </p>
      )}

      {/* Acciones del historial: el filtro (mes, proyectos y usuarios) y el
          menú. El selector global "Registrar viático para" se fue: el dueño
          ahora se elige por fila, igual que en Time Tracking. */}
      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <FiltrosMesRecalculo
            anio={anio}
            mes={mes}
            basePath="/viaticos"
            opciones={opcionesProyecto}
            seleccionados={idsFiltro}
            extra={{ usuarios: params.usuarios }}
          />
          <AccionesViaticos
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
          Aparece si hay ALGUIEN a quien cargarle. */}
      {puedenRecibirCarga.length > 0 && (
        <div className="mt-4">
          <BarraCapturaViatico
            usuarios={puedenRecibirCarga}
            usuarioPorDefecto={
              puedenRecibirCarga.some((u) => u.id === actor.id)
                ? actor.id
                : puedenRecibirCarga[0].id
            }
            puedeElegirUsuario={esAdmin}
            proyectosPorUsuario={cargaPorUsuario}
          />
        </div>
      )}

      {/* Solo la tabla depende del mes: la barra de captura de arriba no. */}
      <BloqueRecalculable
        className="mt-3 flex min-h-0 flex-1 flex-col"
        claseContenido="flex min-h-0 flex-1 flex-col"
      >
      <TablaViaticos
        filas={filas}
        proyectos={opcionesProyecto}
        usuarios={esAdmin ? opcionesUsuario : []}
      />
      </BloqueRecalculable>
    </div>
    </RecalculoProvider>
  );
}
