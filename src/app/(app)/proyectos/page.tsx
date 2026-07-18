import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getClientesProyectos } from "@/lib/proyecto-acceso";
import { ETIQUETA_PRODUCTO } from "../admin/clientes/constantes";
import { ETIQUETA_SEMAFORO, COLOR_SEMAFORO } from "./constantes";
import { InfoButton } from "@/components/info-button";
import { BTN_SECONDARY_SM, BTN_PILL_ON, BTN_PILL_OFF } from "@/lib/ui";

// Listado de proyectos: un proyecto = un cliente activo, con su producto,
// mentores asignados, semáforo y etapa vigentes. El mentor ve solo sus
// clientes asignados (misma regla que Time Tracking); el admin ve todos.
export default async function ProyectosPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const clientes = await getClientesProyectos(usuario);
  const ids = clientes.map((c) => c.id);

  const [asignaciones, semaforos, etapaEventos] = await Promise.all([
    prisma.proyectoAsignado.findMany({
      where: { clienteId: { in: ids } },
      include: { usuario: { select: { nombre: true, activo: true } } },
    }),
    prisma.semaforoEvento.findMany({
      where: { clienteId: { in: ids } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.etapaEvento.findMany({
      where: { clienteId: { in: ids } },
      orderBy: { createdAt: "desc" },
      include: { etapa: { select: { etiqueta: true } } },
    }),
  ]);

  // Vigentes: primer evento (más reciente) por cliente.
  const semaforoActual = new Map<string, string>();
  for (const s of semaforos) {
    if (!semaforoActual.has(s.clienteId)) semaforoActual.set(s.clienteId, s.estado);
  }
  const etapaActual = new Map<string, string>();
  for (const e of etapaEventos) {
    if (!etapaActual.has(e.clienteId)) etapaActual.set(e.clienteId, e.etapa.etiqueta);
  }
  const mentoresPorCliente = new Map<string, string[]>();
  for (const a of asignaciones) {
    if (!a.usuario.activo) continue;
    const lista = mentoresPorCliente.get(a.clienteId) ?? [];
    lista.push(a.usuario.nombre);
    mentoresPorCliente.set(a.clienteId, lista);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Proyectos</h1>
        <InfoButton>
          Cada proyecto reúne al cliente, su producto y el equipo asignado.
          {usuario.rol === "admin"
            ? " Los clientes se gestionan desde Settings → Clientes."
            : " Ves los proyectos de los clientes que tenés asignados."}
        </InfoButton>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <th className="px-4 py-2 text-left">Cliente</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Mentores</th>
              <th className="px-4 py-2">Semáforo</th>
              <th className="px-4 py-2">Etapa actual</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const semaforo = semaforoActual.get(c.id);
              const mentores = mentoresPorCliente.get(c.id) ?? [];
              return (
                <tr key={c.id} className="border-b border-dc-line last:border-0">
                  <td className="px-4 py-3 text-dc-text">{c.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    {c.producto ? (
                      <span className="rounded-full bg-dc-line px-3 py-1 text-xs text-dc-text">
                        {ETIQUETA_PRODUCTO[c.producto] ?? c.producto}
                      </span>
                    ) : (
                      <span className="text-dc-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-dc-muted">
                    {mentores.length > 0 ? mentores.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {semaforo ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-dc-text">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLOR_SEMAFORO[semaforo] }}
                        />
                        {ETIQUETA_SEMAFORO[semaforo]}
                      </span>
                    ) : (
                      <span className="text-dc-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-dc-muted">
                    {etapaActual.get(c.id) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={c.activo ? BTN_PILL_ON : BTN_PILL_OFF}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/proyectos/${c.id}`} className={BTN_SECONDARY_SM}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {clientes.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-dc-muted" colSpan={7}>
                  Todavía no tenés proyectos asignados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
