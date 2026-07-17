import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { TabsNav } from "../../../tabs-nav";

// Cabecera común del detalle de cliente (Volver + nombre) con sub-solapas
// Datos/Equipo, mismo esquema de navegación que el resto de Settings.
export default async function ClienteDetalleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { nombre: true },
  });
  if (!cliente) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-dc-muted transition hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver a Clientes
        </Link>
        <h1 className="mt-2 font-display text-lg uppercase text-white">
          {cliente.nombre}
        </h1>
      </div>

      <div className="mt-4 shrink-0 border-b border-dc-line">
        <TabsNav
          size="sm"
          containerClass=""
          tabs={[
            { href: `/admin/clientes/${id}`, label: "Datos", exact: true },
            { href: `/admin/clientes/${id}/equipo`, label: "Equipo" },
          ]}
        />
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
