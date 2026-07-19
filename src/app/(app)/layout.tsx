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

// El dock agrupa la navegación principal; Settings va aparte, anclado al
// fondo de la sidebar con separación visual.
function navParaRol(rol: string): {
  items: ItemSidebar[];
  settings?: ItemSidebar;
} {
  if (rol === "guest") {
    return {
      items: ITEMS_CARGA,
      settings: { href: "/mi-perfil", label: "Settings", icono: "settings" },
    };
  }
  if (rol === "admin") {
    return {
      items: [...ITEMS_CARGA, ITEM_ANALYTICS],
      // Settings es una categoría desplegable: sus secciones viven en el
      // submenú de la sidebar, no como tabs dentro del contenido.
      settings: {
        href: "/admin/usuarios",
        label: "Settings",
        icono: "settings",
        match: "/admin",
        children: [
          { href: "/admin/usuarios", label: "Usuarios" },
          { href: "/admin/clientes", label: "Clientes" },
          { href: "/admin/etapas", label: "Etapas" },
        ],
      },
    };
  }
  // reader: solo lectura de la rentabilidad de sus clientes asignados.
  return { items: [ITEM_ANALYTICS] };
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
  const { items, settings } = navParaRol(usuario.rol);

  return (
    // Sistema de capas: canvas (fondo) → sidebar, header y workspace como
    // tres cards flotantes con el mismo lenguaje (redondeo, borde, sombra).
    <div className="flex h-dvh gap-3 overflow-hidden bg-dc-deeper p-3">
      <SidebarDesktop
        items={items}
        settingsItem={settings}
        marca={
          <Link href="/dashboard" aria-label="CORE — Distrito Connect (Embarca)">
            <Marca variant="core" />
          </Link>
        }
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {/* Header card: sin branding (CORE vive en la sidebar), compacto y
            con el bloque de usuario centrado verticalmente. */}
        <header className="relative z-50 flex h-10 shrink-0 items-center justify-between gap-3 rounded-2xl border border-dc-line bg-dc-header px-4 shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarMobile
              items={items}
              settingsItem={settings}
              marca={<Marca variant="core" />}
            />
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
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-dc-line bg-dc-main shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
          <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-6 pb-10 pt-8 md:px-10">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
