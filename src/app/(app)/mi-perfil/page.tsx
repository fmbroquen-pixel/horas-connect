import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { ProyectosForm } from "../admin/usuarios/[id]/proyectos-form";
import { TarifaReadOnly } from "@/components/perfil/tarifa-read-only";
import { HistorialTarifas } from "@/components/perfil/historial-tarifas";
import { SeccionDatosUsuario } from "@/components/perfil/seccion-datos";

// Perfil propio del guest (mentor): sus datos y tarifa son de solo lectura;
// solo puede editar sus proyectos asignados.
export default async function MiPerfilPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const usuario = sesion.usuario;
  // El admin tiene Settings completo; el reader no gestiona su perfil.
  if (usuario.rol === "admin") redirect("/admin/usuarios");
  if (usuario.rol !== "guest") redirect("/rentabilidad");

  const [tarifas, clientes, asignados, admins] = await Promise.all([
    prisma.tarifa.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { vigenteDesde: "desc" },
    }),
    prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.proyectoAsignado.findMany({ where: { usuarioId: usuario.id } }),
    prisma.usuario.findMany({
      where: { rol: "admin", activo: true },
      select: { email: true },
      orderBy: { email: "asc" },
    }),
  ]);

  const vigentes = tarifas.filter((t) => t.vigenteHasta === null);
  const historial = tarifas
    .filter((t) => t.vigenteHasta !== null)
    .map((t) => ({
      id: t.id,
      modalidad: t.modalidad,
      ownership: t.ownership,
      valorUsd: Number(t.valorUsd),
      vigenteDesde: t.vigenteDesde,
      vigenteHasta: t.vigenteHasta,
    }));
  const asignadosIds = new Set(asignados.map((a) => a.clienteId));

  const buscarValor = (modalidad: string, ownership: string) => {
    const t = vigentes.find((v) => v.modalidad === modalidad && v.ownership === ownership);
    return t ? Number(t.valorUsd) : undefined;
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="font-display text-xs tracking-[0.3em] text-dc-pink">SETTINGS</p>
        <h1 className="mt-1 font-display text-lg uppercase text-white">Mi perfil</h1>
      </div>

      <SeccionDatosUsuario titulo="Mis datos" soloLectura usuario={usuario} />

      <TarifaReadOnly
        tipoActual={usuario.tipoTarifa}
        valores={{
          presencialOwner: buscarValor("presencial", "owner"),
          presencialBackup: buscarValor("presencial", "backup"),
          virtualOwner: buscarValor("virtual", "owner"),
          virtualBackup: buscarValor("virtual", "backup"),
        }}
        adminsEmails={admins.map((a) => a.email)}
      />

      {/* Único bloque editable por el propio guest. */}
      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <h2 className="font-display text-sm uppercase text-white">
          Proyectos asignados
        </h2>
        <p className="mt-1 text-xs text-dc-muted">
          Elegí en qué proyectos cargás horas.
        </p>
        <div className="mt-4">
          <ProyectosForm
            usuarioId={usuario.id}
            clientes={clientes}
            asignadosIds={asignadosIds}
          />
        </div>
      </div>

      <HistorialTarifas historial={historial} />
    </div>
  );
}
