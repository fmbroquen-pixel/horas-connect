import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { crearConcepto } from "./actions";
import { FilaConcepto, GRID_CONCEPTOS } from "./fila-concepto";
import { AgregarModal } from "@/components/admin/agregar-modal";
import { InfoButton } from "@/components/info-button";
import { FiltroEstado, parseEstadoFiltro } from "@/components/admin/filtro-estado";

// Settings → Conceptos: el catálogo del desplegable de Time Tracking. Es
// deliberadamente corto y no se deriva del Roadmap: el plan proyecta con
// fechas y horas estimadas, el concepto solo clasifica gasto real.
export default async function ConceptosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireAdmin();
  const { estado: estadoParam } = await searchParams;
  const estado = parseEstadoFiltro(estadoParam);

  const conceptos = await prisma.concepto.findMany({
    where: estado === "todos" ? {} : { activo: estado === "activos" },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg uppercase text-white">
            Conceptos Time Tracker
          </h1>
          <InfoButton>
            Opciones del desplegable de Concepto al cargar horas: en qué se
            consumieron. El nombre y el orden se editan en la tabla; al
            desactivar uno deja de ofrecerse, pero las horas que ya lo usaron
            lo conservan.
          </InfoButton>
        </div>
        <AgregarModal
          botonLabel="+ Agregar concepto"
          titulo="Nuevo concepto"
          campos={[
            { name: "nombre", label: "Nombre", placeholder: "Ej: Office Hours" },
          ]}
          action={crearConcepto}
          toastMsg="Concepto creado"
          submitLabel="Crear concepto"
        />
      </div>

      <div className="mt-4 flex shrink-0 justify-end">
        <FiltroEstado basePath="/admin/conceptos" actual={estado} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-[560px] flex-1 flex-col">
          {/* shrink-0 fuera del contenedor con overflow: el encabezado queda
              fijo y solo scrollea el cuerpo. */}
          <div className={`dc-thead ${GRID_CONCEPTOS} shrink-0 border-b border-dc-line px-4`}>
            <span>Nombre</span>
            <span>Orden</span>
            <span>Estado</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {conceptos.map((c) => (
              <FilaConcepto
                key={c.id}
                concepto={{
                  id: c.id,
                  nombre: c.nombre,
                  orden: c.orden,
                  activo: c.activo,
                }}
              />
            ))}

            {conceptos.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-dc-muted">
                {estado === "todos"
                  ? "Todavía no hay conceptos cargados."
                  : "No hay conceptos que coincidan con este filtro."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
