import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { formatFecha } from "@/lib/formato";
import { ETIQUETA_SEMAFORO, COLOR_SEMAFORO } from "../../constantes";
import { TableroForm } from "./tablero-form";
import { SemaforoSelector } from "./semaforo-selector";
import { EtapaForm } from "./etapa-form";

const CARD = "rounded-2xl border border-dc-line bg-dc-card p-5";

// Pestaña Seguimiento: une Tablero, Semáforo y Etapa actual (antes tres
// pestañas separadas). Prioriza lo crítico: Semáforo y Etapa arriba, una al
// lado de la otra en cards compactas (lo primero que se necesita ver de un
// vistazo); Tablero debajo, ocupando el ancho completo. Gantt queda aparte
// por ser un cronograma, no un estado puntual.
export default async function ProyectoSeguimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const [semaforoEventos, etapas, etapaEventos] = await Promise.all([
    prisma.semaforoEvento.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { creadoPor: { select: { nombre: true } } },
    }),
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
    prisma.etapaEvento.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        etapa: { select: { etiqueta: true } },
        creadoPor: { select: { nombre: true } },
      },
    }),
  ]);
  const semaforoActual = semaforoEventos[0] ?? null;
  const etapaActual = etapaEventos[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Semáforo + Etapa actual: una misma línea, cards compactas. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={CARD}>
          <h2 className="font-display text-sm uppercase text-white">Semáforo</h2>
          <p className="mt-1 text-xs text-dc-muted">
            Estado de salud del proyecto. Cada cambio queda registrado con
            fecha y responsable.
          </p>
          <div className="mt-4">
            <SemaforoSelector clienteId={id} actual={semaforoActual?.estado ?? ""} />
          </div>
          {semaforoActual && (
            <p className="mt-3 text-xs text-dc-muted">
              Último cambio: {ETIQUETA_SEMAFORO[semaforoActual.estado]} ·{" "}
              {formatFecha(semaforoActual.createdAt)} · {semaforoActual.creadoPor.nombre}
            </p>
          )}
          {semaforoEventos.length > 1 && (
            <ul className="mt-4 space-y-2 border-t border-dc-line pt-3">
              {semaforoEventos.slice(1).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2.5 text-sm text-dc-muted"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_SEMAFORO[e.estado] }}
                  />
                  <span>{ETIQUETA_SEMAFORO[e.estado]}</span>
                  <span className="ml-auto text-xs">
                    {formatFecha(e.createdAt)} · {e.creadoPor.nombre}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={CARD}>
          <h2 className="font-display text-sm uppercase text-white">Etapa actual</h2>
          <p className="mt-1 text-xs text-dc-muted">
            Las etapas se configuran en Settings → Etapas. Cada cambio queda
            registrado con fecha y responsable.
          </p>
          <div className="mt-4">
            <EtapaForm
              clienteId={id}
              etapas={etapas.map((e) => ({ value: e.id, label: e.etiqueta }))}
              actualId={etapaActual?.etapaId ?? ""}
            />
          </div>
          {etapaActual && (
            <p className="mt-3 text-xs text-dc-muted">
              Etapa vigente: {etapaActual.etapa.etiqueta} · desde{" "}
              {formatFecha(etapaActual.createdAt)} · {etapaActual.creadoPor.nombre}
            </p>
          )}
          {etapaEventos.length > 1 && (
            <ul className="mt-4 space-y-2 border-t border-dc-line pt-3">
              {etapaEventos.slice(1).map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 text-sm text-dc-muted">
                  <span>{e.etapa.etiqueta}</span>
                  <span className="ml-auto text-xs">
                    {formatFecha(e.createdAt)} · {e.creadoPor.nombre}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tablero: ocupa el ancho completo, debajo del semáforo y la etapa. */}
      <div className={CARD}>
        <h2 className="font-display text-sm uppercase text-white">
          Tablero de trabajo
        </h2>
        <p className="mt-1 text-xs text-dc-muted">
          Guardá el enlace al tablero operativo del proyecto (Notion, Trello,
          ClickUp, etc.) para abrirlo desde acá.
        </p>
        <div className="mt-4">
          <TableroForm
            clienteId={id}
            tableroUrl={acceso.cliente.tableroUrl ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
