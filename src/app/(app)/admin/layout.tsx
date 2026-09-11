import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { MarcoSettings } from "@/components/perfil/marco-settings";

// La navegación entre secciones de Settings (Usuarios/Clientes/Conceptos) vive
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

  return <MarcoSettings>{children}</MarcoSettings>;
}
