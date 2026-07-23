import { prisma } from "@/lib/prisma";
import { getClientesProyectos } from "@/lib/proyecto-acceso";
import type { Usuario } from "@/generated/prisma/client";
import { FilaProyectoEstado } from "./fila-proyecto-estado";

// Widget único de Home: lista ejecutiva dentro de una card (sin tabla, sin
// grid, sin dropdowns permanentes). Mismo alcance de visibilidad que la
// sección Proyectos: admin ve todos los clientes activos, un mentor ve los
// suyos asignados. Semáforo y etapa son editables tanto por admin como por
// el mentor con acceso al proyecto (mismo permiso que ya aplica en
// Seguimiento vía cambiarSemaforo/cambiarEtapa); no se muestran mentores.
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
  const etapaPorCliente = new Map<string, string>();
  for (const e of etapaEventos) {
    if (!etapaPorCliente.has(e.clienteId)) etapaPorCliente.set(e.clienteId, e.etapaId);
  }

  const opcionesEtapa = etapas.map((e) => ({ value: e.id, label: e.etiqueta }));

  return (
    // flex-1 min-h-0: ocupa el espacio que le deja Cumpleaños dentro del
    // Home. Título y header de columnas son shrink-0 (siempre visibles);
    // solo la lista de proyectos scrollea.
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dc-line bg-dc-card p-5">
      <h2 className="mb-4 shrink-0 text-base font-semibold text-white">
        Estado de Proyectos
      </h2>
      {clientes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-dc-muted">Todavía no tenés proyectos asignados.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header de columnas: no es <table><thead>, pero cumple la misma
              función visual. Tres columnas equivalentes (min-w-0 flex-1),
              espejo exacto de las filas (fila-proyecto-estado.tsx). */}
          <div className="flex shrink-0 items-center gap-3 border-b border-dc-line pb-2 text-xs font-medium uppercase tracking-wide text-dc-muted">
            <span className="min-w-0 flex-1 text-center">Proyecto</span>
            <span className="min-w-0 flex-1 text-center">Semáforo</span>
            <span className="min-w-0 flex-1 text-center">Etapa actual</span>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto">
            {clientes.map((c) => (
              <FilaProyectoEstado
                key={c.id}
                id={c.id}
                nombre={c.nombre}
                semaforo={semaforoPorCliente.get(c.id) ?? ""}
                etapaId={etapaPorCliente.get(c.id) ?? ""}
                etapas={opcionesEtapa}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
