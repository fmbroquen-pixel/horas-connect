"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Dropdown } from "@/components/dropdown";

// Selector "Registrar horas para" — solo se renderiza para admins (la
// página decide). Guarda la elección en la URL (?usuario=) en vez de en
// estado local: así el servidor puede resolver contra ese usuario los
// clientes asignados, la tarifa vigente y el historial, y la elección
// sobrevive a un refresh o a compartir el link.
export function SelectorUsuario({
  usuarios,
  actual,
  actorId,
}: {
  usuarios: { id: string; nombre: string }[];
  actual: string;
  actorId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const elegir = (id: string) => {
    if (id === actual) return;
    const params = new URLSearchParams(searchParams);
    // El propio admin es el valor por defecto: no ensucia la URL.
    if (id === actorId) params.delete("usuario");
    else params.set("usuario", id);
    const qs = params.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs text-dc-muted">Registrar horas para</span>
      <Dropdown
        value={actual}
        onChange={elegir}
        options={usuarios.map((u) => ({
          value: u.id,
          label: u.id === actorId ? `${u.nombre} (yo)` : u.nombre,
        }))}
        disabled={pending}
        className="w-56"
        ariaLabel="Registrar horas para"
      />
    </div>
  );
}
