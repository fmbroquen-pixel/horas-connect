import { prisma } from "@/lib/prisma";
import { getEtapasPorProyecto } from "@/lib/etapa-actual";
import { FilaProyectoEstado } from "./fila-proyecto-estado";

// Semáforo de proyectos: lista ejecutiva dentro de una card (sin tabla, sin
// grid, sin dropdowns permanentes). El alcance lo decide el Home y llega en
// `clienteIds`, para que el widget responda al mismo filtro de proyectos que
// los KPIs y el gráfico. Semáforo y etapa son editables por admin y por el
// mentor con acceso al proyecto; elegir una etapa escribe sobre el Roadmap,
// así que Home y Follow Up nunca se contradicen.
export async function EstadoProyectos({ clienteIds }: { clienteIds: string[] }) {
  const ids = clienteIds;
  const [clientes, semaforos, etapas] = await Promise.all([
    prisma.cliente.findMany({ where: { id: { in: ids } }, orderBy: { nombre: "asc" } }),
    prisma.semaforoEvento.findMany({
      where: { clienteId: { in: ids } },
      orderBy: { createdAt: "desc" },
    }),
    // La etapa actual sale del Roadmap: es la última tarea en curso del plan.
    getEtapasPorProyecto(ids),
  ]);

  // Vigente = primer evento (más reciente) por cliente.
  const semaforoPorCliente = new Map<string, string>();
  for (const s of semaforos) {
    if (!semaforoPorCliente.has(s.clienteId)) semaforoPorCliente.set(s.clienteId, s.estado);
  }

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
          {/* El eje horizontal va declarado: pedir solo overflow-y deja el
              otro en `auto`, no en `visible`, y la lista se vuelve
              arrastrable de costado sin que nadie lo pida. */}
          <div className="min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto overflow-x-hidden">
            {clientes.map((c) => (
              <FilaProyectoEstado
                key={c.id}
                id={c.id}
                nombre={c.nombre}
                activo={c.activo}
                semaforo={semaforoPorCliente.get(c.id) ?? ""}
                etapaId={etapas[c.id]?.actual?.id ?? ""}
                etapas={(etapas[c.id]?.opciones ?? []).map((t) => ({
                  value: t.id,
                  label: `${t.lista} · ${t.nombre}`,
                }))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
