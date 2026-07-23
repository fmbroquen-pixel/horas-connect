import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { TarifaReadOnly } from "@/components/perfil/tarifa-read-only";
import { HistorialTarifas } from "@/components/perfil/historial-tarifas";
import { SeccionDatosUsuario } from "@/components/perfil/seccion-datos";
import { IconoCandado, SoloLecturaBadge } from "@/components/ui/solo-lectura-badge";

// Perfil propio del guest (mentor): todo es de solo lectura. Sus datos,
// tarifa y clientes asignados los gestiona un admin desde Settings.
export default async function MiPerfilPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const usuario = sesion.usuario;
  // El admin tiene Settings completo; el reader no gestiona su perfil.
  if (usuario.rol === "admin") redirect("/admin/usuarios");
  if (usuario.rol !== "guest") redirect("/rentabilidad");

  const [tarifas, asignados, admins] = await Promise.all([
    prisma.tarifa.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { vigenteDesde: "desc" },
    }),
    prisma.proyectoAsignado.findMany({
      where: { usuarioId: usuario.id },
      include: { cliente: { select: { nombre: true, activo: true } } },
    }),
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
  const clientesAsignados = asignados
    .filter((a) => a.cliente.activo)
    .map((a) => a.cliente.nombre)
    .sort((a, b) => a.localeCompare(b));

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

      {/* Solo lectura: los clientes asignados los gestiona un admin. */}
      <div className="rounded-2xl border border-dc-line bg-dc-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dc-peri">
            <IconoCandado />
          </span>
          <h2 className="font-display text-sm uppercase text-white">
            Clientes asignados
          </h2>
          <SoloLecturaBadge />
        </div>
        <p className="mt-1 text-xs text-dc-muted">
          Son los clientes en los que podés cargar horas. Los gestiona un
          administrador.
        </p>
        {clientesAsignados.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {clientesAsignados.map((nombre) => (
              <span
                key={nombre}
                className="rounded-full bg-dc-line px-3 py-1 text-sm text-dc-text"
              >
                {nombre}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-dc-muted">
            Todavía no tenés clientes asignados. Pedile a un administrador que
            te asigne.
          </p>
        )}
      </div>

      <HistorialTarifas historial={historial} />
    </div>
  );
}
