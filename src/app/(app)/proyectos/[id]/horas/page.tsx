import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatHorasHsMin } from "@/lib/horas";
import { formatMonto, formatFecha } from "@/lib/formato";
import { BTN_SECONDARY } from "@/lib/ui";
import { InfoButton } from "@/components/info-button";

const CARD = "rounded-2xl border border-dc-line bg-dc-card p-6";
const K = "text-xs text-dc-muted";
const V = "mt-1 text-lg font-medium tabular-nums text-dc-text";

// Pestaña Horas y viáticos: resumen de SOLO LECTURA. La carga y edición
// viven únicamente en Time Tracking y Expenses; acá se integra y resume la
// misma fuente de datos (registros del usuario en este cliente), y los
// botones "Ver detalle" abren esos módulos ya filtrados por el proyecto.
// Las actions de TT/Expenses revalidan /proyectos, así que estos números se
// actualizan solos ante altas, ediciones o borrados.
export default async function ProyectoHorasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();
  const { usuario } = acceso;

  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));

  const scopeHoras = { usuarioId: usuario.id, clienteId: id, eliminadoEn: null };
  const scopeViaticos = { usuarioId: usuario.id, clienteId: id, eliminadoEn: null };

  const [
    horasMes,
    horasTotal,
    ultimaHora,
    viaticosMes,
    viaticosTotal,
    ultimoViatico,
  ] = await Promise.all([
    prisma.registroHoras.aggregate({
      where: { ...scopeHoras, fecha: { gte: inicioMes } },
      _sum: { horas: true, montoUsd: true },
    }),
    prisma.registroHoras.aggregate({
      where: scopeHoras,
      _sum: { horas: true, montoUsd: true },
    }),
    prisma.registroHoras.findFirst({
      where: scopeHoras,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      select: { fecha: true },
    }),
    prisma.viatico.groupBy({
      by: ["moneda"],
      where: { ...scopeViaticos, fecha: { gte: inicioMes } },
      _sum: { monto: true },
    }),
    prisma.viatico.groupBy({
      by: ["moneda"],
      where: scopeViaticos,
      _sum: { monto: true },
    }),
    prisma.viatico.findFirst({
      where: scopeViaticos,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      select: { fecha: true },
    }),
  ]);

  const horas = (v: typeof horasMes) => {
    const hs = Number(v._sum.horas ?? 0);
    const usd = Number(v._sum.montoUsd ?? 0);
    return hs > 0 ? `${formatHorasHsMin(hs)} hs · USD ${formatMonto(usd)}` : "—";
  };

  // Los viáticos pueden mezclar monedas: se muestra un total por cada una.
  const montos = (grupos: typeof viaticosMes) => {
    const partes = grupos
      .filter((g) => Number(g._sum.monto ?? 0) > 0)
      .sort((a, b) => a.moneda.localeCompare(b.moneda))
      .map((g) => `${g.moneda} ${formatMonto(Number(g._sum.monto ?? 0))}`);
    return partes.length > 0 ? partes.join(" · ") : "—";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Horas ── */}
      <section className={CARD}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">Horas</h2>
          <InfoButton>
            Resumen de tus horas en este cliente. La carga y edición se hacen
            en Time Tracking; misma fuente de datos, sin duplicados.
          </InfoButton>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className={K}>Total del mes</p>
            <p className={V}>{horas(horasMes)}</p>
          </div>
          <div>
            <p className={K}>Total acumulado</p>
            <p className={V}>{horas(horasTotal)}</p>
          </div>
          <div>
            <p className={K}>Última carga</p>
            <p className={V}>{ultimaHora ? formatFecha(ultimaHora.fecha) : "—"}</p>
          </div>
        </div>

        <div className="mt-6">
          <Link href={`/timetracker?proyecto=${id}`} className={BTN_SECONDARY}>
            Ver detalle en Time Tracking →
          </Link>
        </div>
      </section>

      {/* ── Viáticos ── */}
      <section className={CARD}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">Viáticos</h2>
          <InfoButton>
            Resumen de tus viáticos en este cliente. La carga y edición se
            hacen en Expenses; misma fuente de datos, sin duplicados.
          </InfoButton>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className={K}>Total del mes</p>
            <p className={V}>{montos(viaticosMes)}</p>
          </div>
          <div>
            <p className={K}>Total acumulado</p>
            <p className={V}>{montos(viaticosTotal)}</p>
          </div>
          <div>
            <p className={K}>Último registro</p>
            <p className={V}>{ultimoViatico ? formatFecha(ultimoViatico.fecha) : "—"}</p>
          </div>
        </div>

        <div className="mt-6">
          <Link href={`/viaticos?proyecto=${id}`} className={BTN_SECONDARY}>
            Ver detalle en Expenses →
          </Link>
        </div>
      </section>
    </div>
  );
}
