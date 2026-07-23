import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { ETIQUETA_PRODUCTO } from "../../admin/clientes/constantes";
import { TabsNav } from "../../tabs-nav";

// Cabecera y navegación contextual del proyecto. El chequeo de acceso acá
// cubre todas las pestañas; cada página vuelve a validar en sus actions.
export default async function ProyectoDetalleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const acceso = await getAccesoProyecto(id);
  if (!acceso) notFound();
  const { cliente } = acceso;

  const base = `/proyectos/${id}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-1.5 text-sm text-dc-muted transition hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver a Proyectos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-lg uppercase text-white">
            {cliente.nombre}
          </h1>
          {cliente.producto && (
            <span className="rounded-full bg-dc-peri/15 px-3 py-1 text-xs text-dc-peri">
              {ETIQUETA_PRODUCTO[cliente.producto] ?? cliente.producto}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0 border-b border-dc-line">
        <TabsNav
          size="sm"
          containerClass=""
          tabs={[
            { href: base, label: "Resumen", exact: true },
            { href: `${base}/seguimiento`, label: "Seguimiento" },
            { href: `${base}/gantt`, label: "Gantt" },
            { href: `${base}/equipo`, label: "Equipo" },
          ]}
        />
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
