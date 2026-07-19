import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";

// La navegación entre secciones de Settings (Usuarios/Clientes/Etapas) vive
// en el submenú desplegable de la sidebar; acá solo queda el guard de admin
// y la etiqueta de contexto.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesionActual();

  if (sesion.estado !== "autorizado" || sesion.usuario.rol !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 font-display text-xs tracking-[0.3em] text-dc-pink">
        SETTINGS
      </p>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
