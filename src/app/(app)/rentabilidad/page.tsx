import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { getProyectosVisibles } from "@/lib/proyectos";

// Dashboard de "Project Management": rentabilidad por proyecto. El admin ve
// todos los proyectos; el reader, solo los asignados. El contenido detallado
// (facturación, margen, horas entregadas) se construye en la Fase 3; por
// ahora esta pantalla deja fijado el alcance por rol.
export default async function RentabilidadPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;

  if (usuario.rol === "guest") redirect("/dashboard");

  const proyectos = await getProyectosVisibles(usuario);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-lg uppercase text-white">
          Rentabilidad
        </h1>
        <p className="text-sm text-dc-muted">
          {usuario.rol === "admin"
            ? "Todos los proyectos"
            : "Tus proyectos asignados"}
        </p>
      </div>
      <p className="mt-1 text-sm text-dc-muted">
        Informe de rentabilidad por proyecto y por mes (facturación, horas
        entregadas y costo de mentores). Se construye en la próxima fase.
      </p>

      {proyectos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dc-line bg-dc-card p-8 text-center text-dc-muted">
          {usuario.rol === "reader"
            ? "Todavía no tenés proyectos asignados. Pedile al administrador que te asigne los que querés ver."
            : "Todavía no hay proyectos cargados."}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-dc-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dc-line text-left text-xs text-dc-muted">
                <th className="px-4 py-2 font-normal">Proyecto</th>
                <th className="px-4 py-2 text-right font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr key={p.id} className="border-b border-dc-line last:border-0">
                  <td className="px-4 py-2 text-dc-text">{p.nombre}</td>
                  <td className="px-4 py-2 text-right text-dc-muted">
                    Informe en preparación
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
