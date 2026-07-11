import { getSesionActual } from "@/lib/auth";

export default async function DashboardPage() {
  const sesion = await getSesionActual();
  const usuario = sesion.estado === "autorizado" ? sesion.usuario : null;

  return (
    <div>
      <h1 className="font-display text-xl uppercase text-white">
        Hola, {usuario?.nombre.split(" ")[0]}
      </h1>
      <p className="mt-2 text-sm text-dc-muted">
        La carga de horas y el informe de rentabilidad se agregan en las
        próximas fases. Por ahora esto confirma que el login y los permisos
        funcionan.
      </p>

      <div className="mt-8 rounded-2xl border border-dc-line bg-dc-card p-8 text-center text-dc-muted">
        Todavía no hay datos cargados.
      </div>
    </div>
  );
}
