import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getClientesProyectos } from "@/lib/proyecto-acceso";
import { TablaEstado, type FilaEstado } from "./tabla-estado";

// Tablero "Estado de Proyectos": vista operativa condensada del portafolio,
// separada del análisis financiero (Márgen y Rentabilidad). Mismo alcance de
// visibilidad que la sección Proyectos (activos): admin ve todos, un mentor
// ve los suyos asignados. Solo el admin puede editar desde acá; para el
// resto es de solo lectura (misma regla que ya aplica en Seguimiento).
export default async function EstadoProyectosPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "guest") redirect("/dashboard");

  const clientes = await getClientesProyectos(usuario);
  const ids = clientes.map((c) => c.id);

  const [asignaciones, semaforos, etapaEventos, etapas] = await Promise.all([
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
    prisma.etapa.findMany({
      where: { activo: true },
      orderBy: [{ grupo: "asc" }, { orden: "asc" }],
    }),
  ]);

  // Vigente = primer evento (más reciente) por cliente.
  const semaforoPorCliente = new Map<string, string>();
  for (const s of semaforos) {
    if (!semaforoPorCliente.has(s.clienteId)) semaforoPorCliente.set(s.clienteId, s.estado);
  }
  const etapaPorCliente = new Map<string, { id: string; etiqueta: string }>();
  for (const e of etapaEventos) {
    if (!etapaPorCliente.has(e.clienteId)) {
      etapaPorCliente.set(e.clienteId, { id: e.etapaId, etiqueta: e.etapa.etiqueta });
    }
  }
  const mentoresPorCliente = new Map<string, string[]>();
  for (const a of asignaciones) {
    if (!a.usuario.activo) continue;
    const lista = mentoresPorCliente.get(a.clienteId) ?? [];
    lista.push(a.usuario.nombre);
    mentoresPorCliente.set(a.clienteId, lista);
  }

  const filas: FilaEstado[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    semaforo: semaforoPorCliente.get(c.id) ?? "",
    etapaId: etapaPorCliente.get(c.id)?.id ?? "",
    etapaLabel: etapaPorCliente.get(c.id)?.etiqueta ?? "",
    mentores: (mentoresPorCliente.get(c.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <h1 className="font-display text-xl uppercase text-white">
          Estado de Proyectos
        </h1>
        <p className="text-sm text-dc-muted">
          {usuario.rol === "admin"
            ? "Vista operativa de todos los proyectos activos. Editá semáforo y etapa sin entrar a cada uno."
            : "Vista operativa de tus proyectos asignados."}
        </p>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <TablaEstado
          filas={filas}
          etapas={etapas.map((e) => ({ value: e.id, label: e.etiqueta }))}
          editable={usuario.rol === "admin"}
        />
      </div>
    </div>
  );
}
