"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TabIcono } from "./tabs-nav";

// match: prefijo extra que también marca el ítem como activo (p. ej. Settings
// del admin apunta a /admin/usuarios pero cubre todo /admin).
export type ItemSidebar = {
  href: string;
  label: string;
  icono: string;
  match?: string;
};

// Lista de ítems compartida entre la barra fija (desktop) y el drawer
// (mobile). Estados active/hover/focus consistentes con las viejas solapas:
// activo = texto blanco con glow + barra rosa (acá vertical, a la izquierda).
function NavItems({
  items,
  onNavigate,
}: {
  items: ItemSidebar[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {items.map((t) => {
        const activa =
          pathname === t.href ||
          pathname.startsWith(t.href + "/") ||
          (t.match ? pathname.startsWith(t.match) : false);
        return (
          <li key={t.href}>
            <Link
              href={t.href}
              prefetch
              onClick={onNavigate}
              aria-current={activa ? "page" : undefined}
              className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dc-peri ${
                activa
                  ? "bg-dc-peri/10 text-white [text-shadow:0_0_14px_rgba(255,145,255,0.6)]"
                  : "text-dc-muted hover:bg-dc-line/40 hover:text-dc-text"
              }`}
            >
              {activa && (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-dc-pink shadow-[0_0_10px_2px_rgba(255,145,255,0.7)]"
                />
              )}
              <TabIcono id={t.icono} />
              {t.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Barra lateral fija (pantallas lg en adelante).
export function SidebarDesktop({
  items,
  marca,
}: {
  items: ItemSidebar[];
  marca: React.ReactNode;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-dc-line bg-dc-deep lg:flex">
      {/* Misma altura (h-12) que el header del contenido: una sola barra
          continua en todo el ancho, sin saltos. */}
      <div className="flex h-12 shrink-0 items-center border-b border-dc-line px-4">
        {marca}
      </div>
      <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto p-3">
        <NavItems items={items} />
      </nav>
    </aside>
  );
}

// Hamburguesa + drawer para pantallas chicas. Se cierra al navegar, con Esc
// o tocando el fondo oscurecido.
export function SidebarMobile({
  items,
  marca,
}: {
  items: ItemSidebar[];
  marca: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierre automático al cambiar de ruta (por si onNavigate no alcanzó).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="flex items-center rounded-lg border border-dc-line p-2 text-dc-muted outline-none transition hover:border-dc-peri hover:text-dc-text focus-visible:ring-2 focus-visible:ring-dc-peri"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            className="dc-pop-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-dc-line bg-dc-deep shadow-[0_0_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-dc-line px-4">
              {marca}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-dc-muted transition hover:text-dc-text"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto p-3">
              <NavItems items={items} onNavigate={() => setOpen(false)} />
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
