import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { logout } from "@/app/actions";
import { TabsNav } from "./tabs-nav";
import { Papelera } from "./papelera/papelera";
import { PageTransition } from "./page-transition";
import { PerfilBoton } from "./perfil/perfil-boton";
import { urlAvatar } from "@/lib/supabase/admin";

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
  const avatarUrl = urlAvatar(usuario.avatarPath);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-dc-deeper">
      <header className="shrink-0 border-b border-dc-line bg-dc-deep">
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
            <PerfilBoton
              nombre={usuario.nombre}
              rol={ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              avatarUrl={avatarUrl}
            />
          </div>
        </div>
        <div className={`${CONTENEDOR} flex items-center justify-between gap-3`}>
          <TabsNav tabs={tabsParaRol(usuario.rol)} containerClass="flex-1 min-w-0" />
          <div className="flex shrink-0 items-center gap-1.5 pb-1">
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
            {usuario.rol !== "reader" && <Papelera />}
            {/* Separador: Salir es cierre de sesión, no una herramienta. */}
            <span className="mx-1 h-6 w-px bg-dc-line" aria-hidden="true" />
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-dc-muted transition hover:bg-dc-pink/10 hover:text-dc-pink"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className={`${CONTENEDOR} flex min-h-0 flex-1 flex-col overflow-y-auto py-8`}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
