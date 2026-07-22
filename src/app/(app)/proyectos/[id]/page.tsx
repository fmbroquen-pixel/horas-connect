import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import {
  ETIQUETA_PRODUCTO,
  sumarMesesISO,
  mostrarFechaISO,
} from "../../admin/clientes/constantes";
import { ETIQUETA_SEMAFORO, COLOR_SEMAFORO } from "../constantes";

const CARD = "rounded-2xl border border-dc-line bg-dc-card p-5";
const K = "text-xs text-dc-muted";
const TAG = "inline-block rounded-full bg-dc-peri/15 px-3 py-1 text-xs text-dc-peri";

// Pestaña Resumen: foto general del proyecto. Todo es de solo lectura acá;
// cada dato se edita en su pestaña (Seguimiento, Equipo) o en Settings →
// Clientes. Jerarquía: producto/mentores/etapa como tags, semáforo sin texto
// de estado, fechas de servicio destacadas, equipo reducido a cumpleaños.
export default async function ProyectoResumenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();
  const { cliente } = acceso;

  const [asignaciones, semaforo, etapaEvento, equipo] = await Promise.all([
    prisma.proyectoAsignado.findMany({
      where: { clienteId: id },
      include: { usuario: { select: { nombre: true, activo: true } } },
    }),
    prisma.semaforoEvento.findFirst({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.etapaEvento.findFirst({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      include: { etapa: { select: { etiqueta: true } } },
    }),
    prisma.miembroEquipo.findMany({
      where: { clienteId: id },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, apellido: true, cumpleanos: true },
    }),
  ]);

  const mentores = asignaciones
    .filter((a) => a.usuario.activo)
    .map((a) => a.usuario.nombre);

  const inicioISO = cliente.fechaInicio
    ? cliente.fechaInicio.toISOString().slice(0, 10)
    : "";
  const finISO =
    inicioISO && cliente.duracionMeses
      ? sumarMesesISO(inicioISO, cliente.duracionMeses)
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className={CARD}>
        <p className={K}>Producto</p>
        <div className="mt-2">
          {cliente.producto ? (
            <span className={TAG}>
              {ETIQUETA_PRODUCTO[cliente.producto] ?? cliente.producto}
            </span>
          ) : (
            <span className="text-sm text-dc-muted">Sin definir</span>
          )}
        </div>
      </div>

      <div className={CARD}>
        <p className={K}>Estado</p>
        <div className="mt-2">
          {semaforo ? (
            <span className="inline-flex items-center gap-2 text-sm text-dc-text">
              <span
                aria-hidden
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: COLOR_SEMAFORO[semaforo.estado],
                  boxShadow: `0 0 8px ${COLOR_SEMAFORO[semaforo.estado]}`,
                }}
              />
              {ETIQUETA_SEMAFORO[semaforo.estado]}
            </span>
          ) : (
            <span className="text-sm text-dc-muted">Sin registrar</span>
          )}
        </div>
      </div>

      <div className={CARD}>
        <p className={K}>Etapa actual</p>
        <div className="mt-2">
          {etapaEvento ? (
            <span className={TAG}>{etapaEvento.etapa.etiqueta}</span>
          ) : (
            <span className="text-sm text-dc-muted">Sin registrar</span>
          )}
        </div>
      </div>

      <div className={`${CARD} sm:col-span-2 lg:col-span-3`}>
        <p className={K}>Fechas del servicio</p>
        <div className="mt-2 grid grid-cols-3 gap-4 sm:max-w-md">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-dc-muted">Cuotas</p>
            <p className="mt-0.5 font-display text-base text-white">
              {cliente.duracionMeses ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-dc-muted">Inicio</p>
            <p className="mt-0.5 font-display text-base text-white">
              {inicioISO ? mostrarFechaISO(inicioISO) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-dc-muted">Fin</p>
            <p className="mt-0.5 font-display text-base text-white">
              {finISO ? mostrarFechaISO(finISO) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className={`${CARD} sm:col-span-2 lg:col-span-3`}>
        <p className={K}>Mentores asignados</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {mentores.length > 0 ? (
            mentores.map((m) => (
              <span key={m} className={TAG}>
                {m}
              </span>
            ))
          ) : (
            <span className="text-sm text-dc-muted">Sin mentores</span>
          )}
        </div>
      </div>

      <div className={`${CARD} sm:col-span-2 lg:col-span-3`}>
        <p className={K}>Equipo</p>
        {equipo.length > 0 ? (
          <ul className="mt-2 divide-y divide-dc-line">
            {equipo.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span className="text-dc-text">
                  {m.nombre} {m.apellido}
                </span>
                <span className="tabular-nums text-dc-muted">
                  {m.cumpleanos
                    ? mostrarFechaISO(m.cumpleanos.toISOString().slice(0, 10))
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-dc-muted">Sin integrantes cargados</p>
        )}
      </div>

      <div className={`${CARD} sm:col-span-2 lg:col-span-3`}>
        <p className={K}>Tablero de trabajo</p>
        {cliente.tableroUrl ? (
          <a
            href={cliente.tableroUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-dc-peri transition hover:text-dc-pink"
          >
            {cliente.tableroUrl}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14L21 3" />
            </svg>
          </a>
        ) : (
          <p className="mt-1 text-sm text-dc-muted">
            Sin enlace cargado.{" "}
            <Link
              href={`/proyectos/${id}/seguimiento`}
              className="text-dc-peri transition hover:text-dc-pink"
            >
              Cargarlo en Seguimiento →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
