import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesionActual } from "@/lib/auth";
import { logout } from "@/app/actions";
import { SidebarDesktop, SidebarMobile, type ItemSidebar } from "./sidebar";
import { PageTransition } from "./page-transition";
import { Marca } from "@/components/marca";
import { PerfilBoton } from "./perfil/perfil-boton";
import { urlAvatar } from "@/lib/supabase/admin";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Admin",
  guest: "Mentor",
  reader: "Solo lectura",
};

// Navegación principal en barra lateral. Orden: Home · Proyectos ·
// Time Tracking · Expenses · Time Off · Analytics · Settings.
const ITEMS_CARGA: ItemSidebar[] = [
  { href: "/dashboard", label: "Home", icono: "home" },
  { href: "/proyectos", label: "Proyectos", icono: "proyectos" },
  { href: "/timetracker", label: "Time Tracking", icono: "reloj" },
  { href: "/viaticos", label: "Expenses", icono: "auto" },
  { href: "/vacaciones", label: "Time Off", icono: "sombrilla" },
];

const ITEM_ANALYTICS: ItemSidebar = {
  href: "/rentabilidad",
  label: "Analytics",
  icono: "analytics",
};

function itemsParaRol(rol: string): ItemSidebar[] {
  if (rol === "guest") {
    return [
      ...ITEMS_CARGA,
      { href: "/mi-perfil", label: "Settings", icono: "settings" },
    ];
  }
  if (rol === "admin") {
    return [
      ...ITEMS_CARGA,
      ITEM_ANALYTICS,
      { href: "/admin/usuarios", label: "Settings", icono: "settings", match: "/admin" },
    ];
  }
  // reader: solo lectura de la rentabilidad de sus clientes asignados.
  return [ITEM_ANALYTICS];
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
  const items = itemsParaRol(usuario.rol);

  return (
    <div className="flex h-dvh overflow-hidden bg-dc-deeper">
      <SidebarDesktop items={items} marca={<Marca variant="header" />} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="relative z-50 shrink-0 border-b border-dc-line bg-dc-deep">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarMobile items={items} marca={<Marca variant="header" />} />
              {/* En desktop la marca vive en la sidebar; acá solo en mobile. */}
              <Link
                href="/dashboard"
                aria-label="CORE — Distrito Connect (Embarca)"
                className="lg:hidden"
              >
                <Marca variant="header" />
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <PerfilBoton
                nombre={usuario.nombre}
                rol={ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
                avatarUrl={avatarUrl}
              />
              {/* Separador: Salir es cierre de sesión, no una herramienta. */}
              <span className="h-6 w-px bg-dc-line" aria-hidden="true" />
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

        <main className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-y-auto px-6 py-8 md:px-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
