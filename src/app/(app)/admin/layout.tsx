import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { TabsNav } from "../tabs-nav";

const SECCIONES = [
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/clientes", label: "Proyectos" },
  { href: "/admin/etapas", label: "Etapas" },
];

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
    <div>
      <p className="font-display text-xs tracking-[0.3em] text-dc-pink">
        SETTINGS
      </p>
      <div className="mt-2 border-b border-dc-line">
        <TabsNav tabs={SECCIONES} containerClass="" size="sm" />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
