import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import {
  ETIQUETA_ROL_EQUIPO,
  mostrarFechaISO,
} from "../../../admin/clientes/constantes";
import { IconoCandado, SoloLecturaBadge } from "@/components/ui/solo-lectura-badge";

// Pestaña Equipo de trabajo: SOLO LECTURA. La administración (alta, edición,
// baja) se hace exclusivamente desde Settings → Clientes → Equipo; acá se
// integra y muestra la misma fuente de datos.
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

  return (
    <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dc-peri">
          <IconoCandado />
        </span>
        <h2 className="font-display text-sm uppercase text-white">Equipo</h2>
        <SoloLecturaBadge />
      </div>
      <p className="mt-1 text-xs text-dc-muted">
        La administración del equipo se hace desde Settings → Clientes.
      </p>

      {miembros.length > 0 ? (
        <ul className="mt-4 divide-y divide-dc-line">
          {miembros.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-dc-text">
                  {m.nombre} {m.apellido}
                </p>
                <p className="truncate text-xs text-dc-muted">
                  {ETIQUETA_ROL_EQUIPO[m.rol] ?? m.rol}
                </p>
              </div>
              <span className="shrink-0 tabular-nums text-dc-muted">
                {m.cumpleanos
                  ? mostrarFechaISO(m.cumpleanos.toISOString().slice(0, 10))
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-dc-muted">
          Todavía no hay integrantes cargados.
        </p>
      )}
    </div>
  );
}
