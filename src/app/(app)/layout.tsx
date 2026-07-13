import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { logout } from "@/app/actions";
import { TabsNav } from "./tabs-nav";
import { Papelera } from "./papelera/papelera";
import { PageTransition } from "./page-transition";
import { BTN_SECONDARY_SM } from "@/lib/ui";

const CONTENEDOR = "mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administrador",
  guest: "Mentor",
  reader: "Solo lectura",
};

const TABS_CARGA = [
  { href: "/dashboard", label: "Dashboard", icono: "dashboard" },
  { href: "/timetracker", label: "Timetracker", icono: "reloj" },
  { href: "/viaticos", label: "Viáticos", icono: "auto" },
  { href: "/vacaciones", label: "Vacaciones", icono: "sombrilla" },
];

const TAB_PM = {
  href: "/rentabilidad",
  label: "Project Management",
  icono: "pm",
};

function tabsParaRol(rol: string) {
  if (rol === "guest") return TABS_CARGA;
  // El admin también actúa como mentor (carga sus horas) y además ve la
  // rentabilidad de todos los proyectos (Settings pasó a un botón aparte).
  if (rol === "admin") return [...TABS_CARGA, TAB_PM];
  // reader: solo lectura de la rentabilidad de sus proyectos asignados.
  return [TAB_PM];
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
        <div className={`${CONTENEDOR} flex items-center justify-between gap-3`}>
          <TabsNav tabs={tabsParaRol(usuario.rol)} containerClass="flex-1 min-w-0" />
          {usuario.rol !== "reader" && (
            <div className="flex shrink-0 items-center gap-2 pb-1">
              {usuario.rol === "admin" && (
                <Link
                  href="/admin/usuarios"
                  title="Settings"
                  aria-label="Settings"
                  className="flex items-center rounded-lg border border-dc-line px-2.5 py-1.5 text-base leading-none text-dc-muted transition hover:border-dc-peri hover:text-dc-text"
                >
                  ⚙️
                </Link>
              )}
              <Papelera />
            </div>
          )}
        </div>
      </header>
      <main className={`${CONTENEDOR} flex-1 py-8`}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
