import { prisma } from "@/lib/prisma";
import { getClientesProyectos } from "@/lib/proyecto-acceso";
import type { Usuario } from "@/generated/prisma/client";
import {
  FilaProyectoEstado,
  COL_SEMAFORO_W,
  COL_ETAPA_W,
} from "./fila-proyecto-estado";

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
    <div className="rounded-2xl border border-dc-line bg-dc-card p-5">
      <h2 className="mb-4 text-base font-semibold text-white">Estado de Proyectos</h2>
      {clientes.length === 0 ? (
        <p className="text-sm text-dc-muted">Todavía no tenés proyectos asignados.</p>
      ) : (
        <>
          {/* Header de columnas: no es <table><thead>, pero cumple la misma
              función visual gracias al borde y la tipografía en mayúscula. */}
          <div className="flex items-center gap-3 border-b border-dc-line pb-2 text-xs font-medium uppercase tracking-wide text-dc-muted">
            <span className="min-w-0 flex-1 text-center">Proyecto</span>
            <span className={`${COL_SEMAFORO_W} shrink-0 text-center`}>Semáforo</span>
            <span className={`${COL_ETAPA_W} shrink-0 text-center`}>Etapa actual</span>
          </div>
          <div className="divide-y divide-dc-line">
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
        </>
      )}
    </div>
  );
}
