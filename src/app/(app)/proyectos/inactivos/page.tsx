import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { getClientesProyectosInactivos } from "@/lib/proyecto-acceso";
import { GridProyectos, type ProyectoCard } from "../grid-proyectos";
import { InfoButton } from "@/components/info-button";

// Contraparte de /proyectos para clientes inactivos, con el mismo grid de
// accesos y buscador. Se llega acá desde el desplegable "Proyectos" de la
// sidebar (sección Inactivos).
export default async function ProyectosInactivosPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  const clientes = await getClientesProyectosInactivos(usuario);
  const proyectos: ProyectoCard[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Proyectos inactivos</h1>
        <InfoButton>
          Proyectos de clientes dados de baja. Podés seguir consultando su
          información; la reactivación se hace desde Settings → Clientes.
        </InfoButton>
      </div>

      <GridProyectos proyectos={proyectos} />
    </div>
  );
}
