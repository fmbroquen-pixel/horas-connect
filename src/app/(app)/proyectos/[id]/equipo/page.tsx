import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import {
  ETIQUETA_ROL_EQUIPO,
  mostrarFechaISO,
} from "../../../admin/clientes/constantes";
import { IconoCandado, SoloLecturaBadge } from "@/components/ui/solo-lectura-badge";

// Pestaña Equipo de trabajo: SOLO LECTURA, y con las dos mitades del equipo
// juntas. Arriba los mentores de Embarca con su rol (asignados en Settings →
// Usuarios) y abajo los contactos del lado del cliente (Settings → Clientes →
// Equipo). Cada bloque lee su propia fuente, así que no hay nada que
// sincronizar a mano: son la misma asignación vista desde acá.
export default async function ProyectoEquipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();

  const [miembros, asignaciones] = await Promise.all([
    prisma.miembroEquipo.findMany({
      where: { clienteId: id },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    }),
    prisma.proyectoAsignado.findMany({
      where: { clienteId: id, rol: { not: null } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const mentores = [
    ...asignaciones.filter((a) => a.rol === "owner"),
    ...asignaciones.filter((a) => a.rol === "backup"),
  ].map((a) => ({
    id: a.id,
    nombre: a.usuario.nombre,
    rol: a.rol === "owner" ? "Mentor Owner" : "Mentor Backup",
  }));

  return (
    // Título y nota fijos; solo la lista de integrantes scrollea.
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-dc-line bg-dc-card p-6">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-dc-peri">
          <IconoCandado />
        </span>
        <h2 className="font-display text-sm uppercase text-white">Equipo</h2>
        <SoloLecturaBadge />
      </div>
      <p className="mt-1 shrink-0 text-xs text-dc-muted">
        Los mentores se asignan en Settings → Usuarios; los contactos del
        cliente, en Settings → Clientes.
      </p>

      <div className="mt-4 shrink-0">
        <p className="text-[11px] uppercase tracking-wide text-dc-muted">
          Mentores del proyecto
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {mentores.length > 0 ? (
            mentores.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-2 rounded-full bg-dc-peri/15 px-3 py-1 text-xs text-dc-peri"
              >
                {m.nombre}
                <span className="text-dc-muted">{m.rol}</span>
              </span>
            ))
          ) : (
            <span className="text-sm text-dc-muted">
              Sin mentores asignados todavía.
            </span>
          )}
        </div>
      </div>

      <p className="mt-5 shrink-0 text-[11px] uppercase tracking-wide text-dc-muted">
        Contactos del cliente
      </p>

      {miembros.length > 0 ? (
        <ul className="mt-2 min-h-0 flex-1 divide-y divide-dc-line overflow-y-auto">
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
