import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { logout } from "@/app/actions";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administrador",
  guest: "Mentor",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSesionActual();

  if (sesion.estado === "sin_sesion") {
    redirect("/login");
  }
  if (sesion.estado === "no_autorizado") {
    redirect("/sin-acceso");
  }

  const { usuario } = sesion;

  return (
    <div className="flex min-h-screen flex-col bg-dc-deeper">
      <header className="border-b border-dc-line bg-dc-deep">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="font-display text-[10px] tracking-[0.3em] text-dc-pink">
              DISTRITO CONNECT
            </p>
            <p className="font-display text-sm uppercase text-white">
              Timetracker Connect
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {usuario.rol === "admin" && (
              <Link
                href="/admin/clientes"
                className="rounded-lg border border-dc-line px-3 py-1.5 text-xs text-dc-muted transition hover:text-dc-text"
              >
                Administración
              </Link>
            )}
            <div className="text-right">
              <p className="text-dc-text">{usuario.nombre}</p>
              <p className="text-xs text-dc-muted">
                {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-dc-line px-3 py-1.5 text-xs text-dc-muted transition hover:text-dc-text"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
