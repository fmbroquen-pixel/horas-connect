"use client";

import { usePathname } from "next/navigation";

// Re-monta el contenido al cambiar de ruta para disparar la animación de
// entrada, dando una transición suave entre solapas.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="dc-page-in">
      {children}
    </div>
  );
}
