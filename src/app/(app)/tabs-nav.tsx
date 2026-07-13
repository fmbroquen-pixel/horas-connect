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

function TabLink({
  href,
  label,
  activa,
  size = "md",
}: {
  href: string;
  label: string;
  activa: boolean;
  size?: "md" | "sm";
}) {
  const base = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3 py-2 text-sm";
  return (
    <Link
      href={href}
      prefetch
      className={`relative whitespace-nowrap border-b-2 transition-colors ${base} ${
        activa
          ? "border-dc-pink text-white"
          : "border-transparent text-dc-muted hover:text-dc-text"
      }`}
    >
      {label}
      {!activa && <PendingBar />}
    </Link>
  );
}

export type Tab = { href: string; label: string; match?: string };

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
    <nav className={`${containerClass} flex gap-1 overflow-x-auto`}>
      {tabs.map((t) => (
        <TabLink
          key={t.href}
          href={t.href}
          label={t.label}
          size={size}
          activa={
            pathname === t.href ||
            pathname.startsWith(t.href + "/") ||
            (t.match ? pathname.startsWith(t.match) : false)
          }
        />
      ))}
    </nav>
  );
}
