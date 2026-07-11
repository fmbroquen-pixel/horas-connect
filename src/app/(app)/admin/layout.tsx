import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";

const SECCIONES = [
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/mentores", label: "Mentores" },
  { href: "/admin/temas", label: "Temas" },
  { href: "/admin/usuarios", label: "Usuarios" },
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
        ADMINISTRACIÓN
      </p>
      <nav className="mt-3 flex flex-wrap gap-2">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-dc-line px-3 py-1.5 text-sm text-dc-muted transition hover:border-dc-peri hover:text-dc-text"
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
