import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { logout } from "@/app/actions";
import { TabsNav } from "./tabs-nav";
import { BTN_SECONDARY_SM } from "@/lib/ui";

const CONTENEDOR = "mx-auto w-full max-w-[1600px] px-6 md:px-8";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administrador",
  guest: "Mentor",
  reader: "Solo lectura",
};

function tabsParaRol(rol: string) {
  if (rol === "guest") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/timetracker", label: "Timetracker" },
      { href: "/viaticos", label: "Viáticos" },
      { href: "/vacaciones", label: "Vacaciones" },
    ];
  }
  if (rol === "admin") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/timetracker", label: "Timetracker" },
      { href: "/viaticos", label: "Viáticos" },
      { href: "/vacaciones", label: "Vacaciones" },
      { href: "/admin/usuarios", label: "Administración" },
    ];
  }
  return [{ href: "/dashboard", label: "Dashboard" }];
}

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
        <div className={`${CONTENEDOR} flex items-center justify-between py-4`}>
          <Link href="/dashboard">
            <p className="font-display text-[10px] tracking-[0.3em] text-dc-pink">
              DISTRITO CONNECT
            </p>
            <p className="font-display text-sm uppercase text-white">
              Timetracker Connect
            </p>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <p className="text-dc-text">{usuario.nombre}</p>
              <p className="text-xs text-dc-muted">
                {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              </p>
            </div>
            <form action={logout}>
              <button type="submit" className={BTN_SECONDARY_SM}>
                Salir
              </button>
            </form>
          </div>
        </div>
        <TabsNav tabs={tabsParaRol(usuario.rol)} containerClass={CONTENEDOR} />
      </header>
      <main className={`${CONTENEDOR} flex-1 py-8`}>{children}</main>
    </div>
  );
}
