import { prisma } from "@/lib/prisma";
import { getClientesProyectos } from "@/lib/proyecto-acceso";
import type { Usuario } from "@/generated/prisma/client";
import { CardProyectoEstado } from "./card-proyecto-estado";

// Widget de Home: estado editable del portafolio en formato cards (no
// tabla). Mismo alcance de visibilidad que la sección Proyectos: admin ve
// todos los clientes activos, un mentor ve los suyos asignados. Semáforo y
// etapa son editables tanto por admin como por el mentor con acceso al
// proyecto (mismo permiso que ya aplica en Seguimiento vía cambiarSemaforo/
// cambiarEtapa); no se muestran mentores acá.
export async function EstadoProyectos({ usuario }: { usuario: Usuario }) {
  const clientes = await getClientesProyectos(usuario);
  const ids = clientes.map((c) => c.id);

  const [semaforos, etapaEventos, etapas] = await Promise.all([
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

  const opcionesEtapa = etapas.map((e) => ({ value: e.id, label: e.etiqueta }));

  if (clientes.length === 0) {
    return (
      <p className="rounded-2xl border border-dc-line bg-dc-card px-4 py-6 text-center text-sm text-dc-muted">
        Todavía no tenés proyectos asignados.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {clientes.map((c) => (
        <CardProyectoEstado
          key={c.id}
          id={c.id}
          nombre={c.nombre}
          semaforo={semaforoPorCliente.get(c.id) ?? ""}
          etapaId={etapaPorCliente.get(c.id)?.id ?? ""}
          etapas={opcionesEtapa}
        />
      ))}
    </div>
  );
}
