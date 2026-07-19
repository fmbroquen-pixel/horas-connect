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

// Navegación única y persistente en la sidebar. Orden: Home · Proyectos ·
// Time Tracking · Expenses · Time Off · Analytics · Settings (desplegable).
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

  // Isotipo oficial (favicon) + CORE: único branding dentro de la app.
  const logo = (
    <Link
      href="/dashboard"
      aria-label="CORE — Distrito Connect (Embarca)"
      className="flex items-center gap-2.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={22} height={22} className="shrink-0" />
      <Marca variant="core" />
    </Link>
  );

  // Bloque de usuario del pie de la sidebar: avatar + nombre + rol (con el
  // popover de perfil) y Salir como acción separada a la derecha.
  const perfil = (
    <div className="flex items-center gap-2">
      <PerfilBoton
        nombre={usuario.nombre}
        rol={ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
        avatarUrl={avatarUrl}
      />
      <form action={logout} className="shrink-0">
        <button
          type="submit"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex items-center rounded-lg p-2 text-dc-muted transition hover:bg-dc-pink/10 hover:text-dc-pink"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </form>
    </div>
  );

  return (
    // Sistema de capas sin header: canvas (fondo) → sidebar card (única
    // navegación) → workspace card ocupando toda la altura disponible.
    <div className="flex h-dvh gap-3 overflow-hidden bg-dc-deeper p-3">
      <SidebarDesktop
        items={items}
        settingsItem={settings}
        marca={logo}
        perfil={perfil}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {/* Barra mínima solo para mobile (la sidebar está oculta): abre el
            drawer, que trae navegación, perfil y logout. */}
        <div className="flex shrink-0 items-center gap-3 lg:hidden">
          <SidebarMobile
            items={items}
            settingsItem={settings}
            marca={logo}
            perfil={perfil}
          />
          {logo}
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-dc-line bg-dc-main shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
          <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-6 pb-10 pt-8 md:px-10">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
