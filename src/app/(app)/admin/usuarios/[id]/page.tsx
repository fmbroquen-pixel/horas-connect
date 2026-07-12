import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { actualizarUsuario, guardarTarifa } from "../actions";
import { TarifaForm } from "./tarifa-form";
import { ProyectosForm } from "./proyectos-form";
import { BTN_SECONDARY } from "@/lib/ui";

const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  valor_cero: "Valor cero",
};
const ETIQUETA_OWNERSHIP: Record<string, string> = {
  owner: "Owner",
  backup: "Backup",
  valor_cero: "Valor cero",
};

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();

  const esGuest = usuario.rol === "guest";
  // El reader también recibe proyectos asignados (definen qué rentabilidad
  // puede ver), pero no tiene tarifa (no reporta horas).
  const asignaProyectos = usuario.rol === "guest" || usuario.rol === "reader";

  const [tarifas, clientes, asignados] = await Promise.all([
    esGuest
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
        <h1 className="font-display text-lg uppercase text-white">
          {usuario.nombre}
        </h1>
        <form
          action={actualizarUsuario.bind(null, usuario.id)}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            name="nombre"
            defaultValue={usuario.nombre}
            className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          />
          <input
            name="email"
            type="email"
            defaultValue={usuario.email}
            className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          />
          <select
            name="rol"
            defaultValue={usuario.rol}
            className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
          >
            <option value="guest">Mentor (guest)</option>
            <option value="reader">Solo lectura (reader)</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="submit"
            className={BTN_SECONDARY}
          >
            Guardar datos
          </button>
        </form>
      </div>

      {esGuest && (
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
            {esGuest
              ? "Limitan en qué proyectos puede cargar horas."
              : "Limitan qué proyectos puede ver en el informe de rentabilidad."}
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

      {esGuest && (
        <>
          {historial.length > 0 && (
            <div>
              <h2 className="font-display text-sm uppercase text-white">
                Historial de tarifas
              </h2>
              <div className="mt-3 overflow-hidden dc-panel">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dc-line text-left text-xs text-dc-muted">
                      <th className="px-4 py-2 font-normal">Modalidad</th>
                      <th className="px-4 py-2 font-normal">Ownership</th>
                      <th className="px-4 py-2 font-normal">Valor USD</th>
                      <th className="px-4 py-2 font-normal">Vigencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-dc-line last:border-0 text-dc-muted"
                      >
                        <td className="px-4 py-2">
                          {ETIQUETA_MODALIDAD[t.modalidad]}
                        </td>
                        <td className="px-4 py-2">{ETIQUETA_OWNERSHIP[t.ownership]}</td>
                        <td className="px-4 py-2">{Number(t.valorUsd).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          {t.vigenteDesde.toLocaleDateString("es-AR")} –{" "}
                          {t.vigenteHasta?.toLocaleDateString("es-AR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
