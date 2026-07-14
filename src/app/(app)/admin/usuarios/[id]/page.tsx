import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarUsuario, guardarTarifa } from "../actions";
import { TarifaForm } from "./tarifa-form";
import { ProyectosForm } from "./proyectos-form";
import { HistorialTarifas } from "@/components/perfil/historial-tarifas";
import { SeccionDatosUsuario } from "@/components/perfil/seccion-datos";

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();

  // Guest y admin reportan horas, así que ambos necesitan tarifa (el admin
  // también actúa como mentor). El reader no reporta horas.
  const puedeTarifa = usuario.rol === "guest" || usuario.rol === "admin";
  // Todos los roles reciben proyectos asignados: guest y admin para limitar
  // dónde cargan horas; reader para acotar qué rentabilidad puede ver.
  const asignaProyectos = true;

  const [tarifas, clientes, asignados] = await Promise.all([
    puedeTarifa
      ? prisma.tarifa.findMany({
          where: { usuarioId: id },
          orderBy: { vigenteDesde: "desc" },
        })
      : Promise.resolve([]),
    asignaProyectos
      ? prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })
      : Promise.resolve([]),
    asignaProyectos
      ? prisma.proyectoAsignado.findMany({ where: { usuarioId: id } })
      : Promise.resolve([]),
  ]);

  const vigentes = tarifas.filter((t) => t.vigenteHasta === null);
  const historial = tarifas.filter((t) => t.vigenteHasta !== null);
  const asignadosIds = new Set(asignados.map((a) => a.clienteId));

  const buscarValor = (modalidad: string, ownership: string) => {
    const t = vigentes.find((v) => v.modalidad === modalidad && v.ownership === ownership);
    return t ? Number(t.valorUsd) : undefined;
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1.5 text-sm text-dc-muted transition hover:text-dc-text"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver a Usuarios
        </Link>
        <h1 className="mt-2 font-display text-lg uppercase text-white">
          {usuario.nombre}
        </h1>
      </div>

      <SeccionDatosUsuario
        titulo={admin.id === usuario.id ? "Mis datos" : "Datos del usuario"}
        soloLectura={false}
        usuario={usuario}
        action={actualizarUsuario.bind(null, usuario.id)}
      />

      {puedeTarifa && (
        <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
          <h2 className="font-display text-sm uppercase text-white">
            Convenio de tarifa
          </h2>
          <div className="mt-4">
            <TarifaForm
              tipoActual={usuario.tipoTarifa}
              valores={{
                presencialOwner: buscarValor("presencial", "owner"),
                presencialBackup: buscarValor("presencial", "backup"),
                virtualOwner: buscarValor("virtual", "owner"),
                virtualBackup: buscarValor("virtual", "backup"),
              }}
              action={guardarTarifa.bind(null, usuario.id)}
            />
          </div>
        </div>
      )}

      {asignaProyectos && (
        <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
          <h2 className="font-display text-sm uppercase text-white">
            Proyectos asignados
          </h2>
          <p className="mt-1 text-xs text-dc-muted">
            {usuario.rol === "reader"
              ? "Limitan qué proyectos puede ver en el informe de rentabilidad."
              : "Limitan en qué proyectos puede cargar horas."}
          </p>
          <div className="mt-4">
            <ProyectosForm
              usuarioId={usuario.id}
              clientes={clientes}
              asignadosIds={asignadosIds}
            />
          </div>
        </div>
      )}

      {puedeTarifa && (
        <HistorialTarifas
          historial={historial.map((t) => ({
            id: t.id,
            modalidad: t.modalidad,
            ownership: t.ownership,
            valorUsd: Number(t.valorUsd),
            vigenteDesde: t.vigenteDesde,
            vigenteHasta: t.vigenteHasta,
          }))}
        />
      )}
    </div>
  );
}
