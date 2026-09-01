import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccesoProyecto } from "@/lib/proyecto-acceso";
import { ETIQUETA_PRODUCTO } from "../../admin/clientes/constantes";
import { TabsNav } from "../../tabs-nav";
import { IconoCandado } from "@/components/ui/solo-lectura-badge";
import { MOTIVO_INACTIVO } from "@/lib/inactivo";

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
  // Un proyecto inactivo pertenece a Inactivos, se haya llegado desde donde se
  // haya llegado. Antes el volver era siempre a Activos, asi que entrar desde
  // Home CORE dejaba al usuario en un listado donde el proyecto que acababa de
  // mirar no estaba.
  const inactivo = !cliente.activo;
  const volver = inactivo
    ? { href: "/proyectos/inactivos", texto: "Volver a Inactivos" }
    : { href: "/proyectos", texto: "Volver a Proyectos" };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <Link
          href={volver.href}
          className="inline-flex items-center gap-1.5 text-sm text-dc-muted transition hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {volver.texto}
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
          {inactivo && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-dc-peri/30 bg-dc-peri/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-dc-peri"
              // El badge ya dice el motivo: repetirlo
              // en el globo no aportaría nada, así que el tooltip completa con
              // lo único que falta saber.
              data-tooltip="Su historia se conserva completa."
            >
              <IconoCandado size={13} />
              {MOTIVO_INACTIVO}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0 border-b border-dc-line">
        <TabsNav
          size="sm"
          containerClass=""
          tabs={[
            { href: base, label: "Home", exact: true },
            { href: `${base}/follow-up`, label: "Follow Up" },
            { href: `${base}/equipo`, label: "Equipo" },
          ]}
        />
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
