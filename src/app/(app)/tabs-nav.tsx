"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

function PendingBar() {
  // Barra animada bajo la solapa mientras la navegación está en curso, para
  // que el click se sienta inmediato aunque la página tarde en cargar.
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-dc-pink transition-transform duration-300 ${
        pending ? "scale-x-100" : "scale-x-0"
      }`}
    />
  );
}

export const ICONOS: Record<string, React.ReactNode> = {
  // Proyectos: maletín.
  proyectos: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  // Settings: engranaje simplificado.
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>
  ),
  // Home: casa.
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </>
  ),
  // Dashboard/Analytics: barras + ejes.
  analytics: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </>
  ),
  // Timetracker: reloj.
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // Vacaciones: sombrilla.
  sombrilla: (
    <>
      <path d="M12 3C7 3 3 7 3 11h18c0-4-4-8-9-8z" />
      <path d="M12 11v9" />
      <path d="M12 20a2 2 0 0 0 3 0" />
    </>
  ),
  // Project Management: tablero/gestión.
  pm: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 4v16M14 8h4M14 12h4" />
      <path d="M8 8l1.5 1.5L12 7" />
    </>
  ),
};

export function TabIcono({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {ICONOS[id]}
    </svg>
  );
}

function TabLink({
  href,
  label,
  icono,
  activa,
  size = "md",
}: {
  href: string;
  label: string;
  icono?: string;
  activa: boolean;
  size?: "md" | "sm";
}) {
  const base = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";
  return (
    <Link
      href={href}
      prefetch
      className={`relative flex items-center gap-1 whitespace-nowrap rounded-t-lg transition-colors ${base} ${
        activa
          ? "text-white [text-shadow:0_0_14px_rgba(255,145,255,0.6)]"
          : "text-dc-muted hover:text-dc-text"
      }`}
    >
      {icono && <TabIcono id={icono} />}
      {label}
      {activa ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-dc-pink shadow-[0_0_10px_2px_rgba(255,145,255,0.7)]"
        />
      ) : (
        <PendingBar />
      )}
    </Link>
  );
}

// exact: la solapa solo se marca activa con la ruta exacta (para sub-solapas
// anidadas tipo Datos/Equipo, donde una es prefijo de la otra).
export type Tab = {
  href: string;
  label: string;
  match?: string;
  icono?: string;
  exact?: boolean;
};

export function TabsNav({
  tabs,
  containerClass = "mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14",
  size = "md",
}: {
  tabs: Tab[];
  containerClass?: string;
  size?: "md" | "sm";
}) {
  const pathname = usePathname();

  return (
    <nav className={`${containerClass} flex gap-0.5 overflow-x-auto`}>
      {tabs.map((t) => (
        <TabLink
          key={t.href}
          href={t.href}
          label={t.label}
          icono={t.icono}
          size={size}
          activa={
            t.exact
              ? pathname === t.href
              : pathname === t.href ||
                pathname.startsWith(t.href + "/") ||
                (t.match ? pathname.startsWith(t.match) : false)
          }
        />
      ))}
    </nav>
  );
}
