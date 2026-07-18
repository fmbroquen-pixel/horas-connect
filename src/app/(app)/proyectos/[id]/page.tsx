import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatFecha } from "@/lib/formato";
import {
  ETIQUETA_PRODUCTO,
  sumarMesesISO,
  mostrarFechaISO,
} from "../../admin/clientes/constantes";
import { ETIQUETA_SEMAFORO, COLOR_SEMAFORO } from "../constantes";

const CARD = "rounded-2xl border border-dc-line bg-dc-card p-5";
const K = "text-xs text-dc-muted";
const V = "mt-1 text-sm text-dc-text";

// Pestaña Resumen: foto general del proyecto. Todo es de solo lectura acá;
// cada dato se edita en su pestaña o en Settings → Clientes.
export default async function ProyectoResumenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();
  const { cliente } = acceso;

  const [asignaciones, semaforo, etapaEvento, equipoCount] = await Promise.all([
    prisma.proyectoAsignado.findMany({
      where: { clienteId: id },
      include: { usuario: { select: { nombre: true, activo: true } } },
    }),
    prisma.semaforoEvento.findFirst({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      include: { creadoPor: { select: { nombre: true } } },
    }),
    prisma.etapaEvento.findFirst({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      include: {
        etapa: { select: { etiqueta: true } },
        creadoPor: { select: { nombre: true } },
      },
    }),
    prisma.miembroEquipo.count({ where: { clienteId: id } }),
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
        <p className={V}>
          {cliente.producto
            ? ETIQUETA_PRODUCTO[cliente.producto] ?? cliente.producto
            : "Sin definir"}
        </p>
      </div>

      <div className={CARD}>
        <p className={K}>Fechas del servicio</p>
        <p className={V}>
          {inicioISO ? mostrarFechaISO(inicioISO) : "Sin fecha de inicio"}
          {finISO ? ` → ${mostrarFechaISO(finISO)}` : ""}
        </p>
        <p className="mt-1 text-xs text-dc-muted">
          {cliente.duracionMeses
            ? `Duración: ${cliente.duracionMeses} meses`
            : "Duración sin definir"}
        </p>
      </div>

      <div className={CARD}>
        <p className={K}>Estado general</p>
        <p className={V}>{cliente.activo ? "Activo" : "Inactivo"}</p>
        {semaforo ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-dc-muted">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_SEMAFORO[semaforo.estado] }}
            />
            Semáforo {ETIQUETA_SEMAFORO[semaforo.estado]} ·{" "}
            {formatFecha(semaforo.createdAt)} · {semaforo.creadoPor.nombre}
          </p>
        ) : (
          <p className="mt-1 text-xs text-dc-muted">Semáforo sin registrar</p>
        )}
      </div>

      <div className={CARD}>
        <p className={K}>Mentores asignados</p>
        <p className={V}>{mentores.length > 0 ? mentores.join(", ") : "Sin mentores"}</p>
      </div>

      <div className={CARD}>
        <p className={K}>Etapa actual</p>
        <p className={V}>{etapaEvento ? etapaEvento.etapa.etiqueta : "Sin registrar"}</p>
        {etapaEvento && (
          <p className="mt-1 text-xs text-dc-muted">
            Desde {formatFecha(etapaEvento.createdAt)} · {etapaEvento.creadoPor.nombre}
          </p>
        )}
      </div>

      <div className={CARD}>
        <p className={K}>Equipo del cliente</p>
        <p className={V}>
          {equipoCount > 0
            ? `${equipoCount} integrante${equipoCount === 1 ? "" : "s"}`
            : "Sin integrantes cargados"}
        </p>
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
              href={`/proyectos/${id}/tablero`}
              className="text-dc-peri transition hover:text-dc-pink"
            >
              Cargarlo en Tablero →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
