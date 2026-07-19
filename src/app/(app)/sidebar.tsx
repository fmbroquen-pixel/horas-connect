"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { TabIcono } from "./tabs-nav";

// match: prefijo extra que también marca el ítem como activo (p. ej. Settings
// del admin apunta a /admin/usuarios pero cubre todo /admin).
// children: convierte el ítem en una categoría desplegable (submenú).
export type ItemSidebar = {
  href: string;
  label: string;
  icono: string;
  match?: string;
  children?: { href: string; label: string }[];
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

// Categoría desplegable (Settings): botón con chevron que abre un submenú
// debajo, con las mismas convenciones visuales que los ítems de navegación.
// Se expande solo al entrar a cualquiera de sus rutas y expone estado con
// aria-expanded/aria-current para mantener la accesibilidad por teclado.
function SettingsNav({
  item,
  onNavigate,
}: {
  item: ItemSidebar;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const submenuId = useId();
  const enSeccion = item.match
    ? pathname.startsWith(item.match)
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const [abierto, setAbierto] = useState(enSeccion);

  // Si se entra a una ruta de la sección (por link directo o navegación),
  // el submenú se expande solo.
  useEffect(() => {
    if (enSeccion) setAbierto(true);
  }, [enSeccion]);

  // Sin hijos (Settings del mentor → Mi perfil): ítem simple.
  if (!item.children?.length) {
    return <NavItems items={[item]} onNavigate={onNavigate} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        aria-expanded={abierto}
        aria-controls={submenuId}
        className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dc-peri ${
          enSeccion
            ? "text-white [text-shadow:0_0_14px_rgba(255,145,255,0.6)]"
            : "text-dc-muted hover:bg-dc-line/40 hover:text-dc-text"
        }`}
      >
        <TabIcono id={item.icono} />
        {item.label}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`ml-auto shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <ul id={submenuId} className="mt-0.5 space-y-0.5 pl-9">
          {item.children.map((c) => {
            const activa = pathname === c.href || pathname.startsWith(c.href + "/");
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  prefetch
                  onClick={onNavigate}
                  aria-current={activa ? "page" : undefined}
                  className={`relative flex items-center rounded-lg px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dc-peri ${
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
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Barra lateral fija (pantallas lg en adelante): una card flotante sobre el
// fondo de la app, con bordes redondeados, sombra sutil y margen respecto de
// los bordes (los aporta el layout). Es un "dock": el grupo principal arriba
// y Settings anclado al fondo, separado por aire y una línea sutil.
export function SidebarDesktop({
  items,
  settingsItem,
  marca,
  perfil,
}: {
  items: ItemSidebar[];
  settingsItem?: ItemSidebar;
  marca: React.ReactNode;
  // Bloque de usuario (avatar, nombre, rol y Salir) anclado al pie.
  perfil: React.ReactNode;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col rounded-2xl border border-dc-line bg-dc-sidebar shadow-[0_8px_28px_rgba(0,0,0,0.28)] lg:flex">
      {/* Único branding dentro de la app: isotipo + CORE. */}
      <div className="shrink-0 px-4 pb-2 pt-4">{marca}</div>
      <nav
        aria-label="Navegación principal"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-2"
      >
        <NavItems items={items} />
        {settingsItem && (
          <div className="mt-1">
            <SettingsNav item={settingsItem} />
          </div>
        )}
        <div className="mt-auto border-t border-dc-line pt-4">{perfil}</div>
      </nav>
    </aside>
  );
}

// Hamburguesa + drawer para pantallas chicas. Se cierra al navegar, con Esc
// o tocando el fondo oscurecido.
export function SidebarMobile({
  items,
  settingsItem,
  marca,
  perfil,
}: {
  items: ItemSidebar[];
  settingsItem?: ItemSidebar;
  marca: React.ReactNode;
  perfil: React.ReactNode;
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
            className="dc-pop-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-dc-line bg-dc-sidebar shadow-[0_0_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-dc-line px-4">
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
            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
              <NavItems items={items} onNavigate={() => setOpen(false)} />
              {settingsItem && (
                <div className="mt-1">
                  <SettingsNav item={settingsItem} onNavigate={() => setOpen(false)} />
                </div>
              )}
              <div className="mt-auto border-t border-dc-line pt-4">{perfil}</div>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
