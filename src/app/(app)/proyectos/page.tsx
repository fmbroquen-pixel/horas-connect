import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSesionActual } from "@/lib/auth";
import { getClientesProyectos } from "@/lib/proyecto-acceso";
import { ETIQUETA_PRODUCTO } from "../admin/clientes/constantes";
import { GridProyectos, type ProyectoCard } from "./grid-proyectos";
import { InfoButton } from "@/components/info-button";

// Proyectos como selector rápido de espacios de trabajo: grid de cards con
// buscador, en orden alfabético. Semáforo, etapa y estado viven dentro de
// cada proyecto (o en Analytics), no acá. El mentor ve solo sus clientes
// asignados (misma regla que Time Tracking); el admin ve todos.
export default async function ProyectosPage() {
  const sesion = await getSesionActual();
  if (sesion.estado !== "autorizado") redirect("/login");
  const { usuario } = sesion;
  if (usuario.rol === "reader") redirect("/rentabilidad");

  // getClientesProyectos ya devuelve orden alfabético por nombre.
  const clientes = await getClientesProyectos(usuario);
  const asignaciones = await prisma.proyectoAsignado.findMany({
    where: { clienteId: { in: clientes.map((c) => c.id) } },
    include: { usuario: { select: { nombre: true, activo: true } } },
  });

  const mentoresPorCliente = new Map<string, string[]>();
  for (const a of asignaciones) {
    if (!a.usuario.activo) continue;
    const lista = mentoresPorCliente.get(a.clienteId) ?? [];
    lista.push(a.usuario.nombre);
    mentoresPorCliente.set(a.clienteId, lista);
  }

  const proyectos: ProyectoCard[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    producto: c.producto ? ETIQUETA_PRODUCTO[c.producto] ?? c.producto : null,
    mentores: (mentoresPorCliente.get(c.id) ?? []).sort((a, b) =>
      a.localeCompare(b),
    ),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="font-display text-lg uppercase text-white">Proyectos</h1>
        <InfoButton>
          Elegí un proyecto para entrar a su espacio de trabajo.
          {usuario.rol === "admin"
            ? " Los clientes se gestionan desde Settings → Clientes."
            : " Ves los proyectos de los clientes que tenés asignados."}
        </InfoButton>
      </div>

      <GridProyectos proyectos={proyectos} />
    </div>
  );
}
