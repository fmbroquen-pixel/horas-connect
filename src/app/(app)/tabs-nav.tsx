"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabsNav({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4">
      {tabs.map((t) => {
        const activa = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              activa
                ? "whitespace-nowrap border-b-2 border-dc-pink px-3 py-2 text-sm text-white"
                : "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-dc-muted transition hover:text-dc-text"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
