import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { GRID_EQUIPO, type MiembroFila } from "../../../admin/clientes/constantes";
import { NuevoMiembroBoton } from "../../../admin/clientes/[id]/equipo/nuevo-miembro-form";
import { FilaMiembro } from "../../../admin/clientes/[id]/equipo/fila-miembro";
import { InfoButton } from "@/components/info-button";

// Pestaña Equipo de trabajo: MISMOS componentes, actions y tabla que la
// pestaña Equipo de Settings → Clientes (única fuente de datos). Acá pueden
// gestionarlo también los mentores asignados al proyecto.
export default async function ProyectoEquipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const miembros = await prisma.miembroEquipo.findMany({
    where: { clienteId: id },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  const filas: MiembroFila[] = miembros.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    apellido: m.apellido,
    rol: m.rol,
    cumpleanos: m.cumpleanos ? m.cumpleanos.toISOString().slice(0, 10) : "",
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm uppercase text-white">
            Equipo de trabajo
          </h2>
          <InfoButton>
            Integrantes del equipo del cliente: quién es quién en el proyecto
            y su cumpleaños. Es la misma lista que se ve en Settings →
            Clientes.
          </InfoButton>
        </div>
        <NuevoMiembroBoton clienteId={id} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 overflow-x-auto dc-panel">
        <div className="flex min-h-0 min-w-[780px] flex-1 flex-col">
          <div className={`dc-thead ${GRID_EQUIPO} shrink-0 border-b border-dc-line px-3`}>
            <span>Nombre</span>
            <span>Apellido</span>
            <span>Rol</span>
            <span>Cumpleaños</span>
            <span />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filas.map((f) => (
              <FilaMiembro key={f.id} miembro={f} />
            ))}

            {filas.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-dc-muted">
                Todavía no hay integrantes cargados.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
