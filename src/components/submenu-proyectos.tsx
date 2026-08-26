"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListaProyectos, type OpcionFiltro } from "@/components/lista-proyectos";
import { SubmenuMenu, useMenuAcciones } from "@/components/ui/menu-acciones";
import { urlFiltroMes } from "@/lib/url-filtro";

// "Proyectos →" dentro del menú de la pantalla.
//
// Aplica al cerrar el menú, igual que antes aplicaba al cerrar el popover. No
// hay ningún cartel que lo diga: el resultado se ve en la tabla al instante y
// el aviso ocupaba una línea para explicar algo que se entiende usándolo una
// vez.
export function SubmenuProyectos({
  anio,
  mes,
  basePath,
  opciones,
  seleccionados,
  extra,
}: {
  anio: number;
  mes: number;
  basePath: string;
  opciones: OpcionFiltro[];
  seleccionados: string[];
  extra?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const { vista, cerrar } = useMenuAcciones();

  // Al salir del submenú se aplica lo elegido. Se compara contra lo que ya
  // está aplicado para no navegar cuando no se cambió nada.
  const aplicar = (ids: Set<string>) => {
    const iguales =
      ids.size === seleccionados.length &&
      seleccionados.every((id) => ids.has(id));
    if (iguales) {
      cerrar();
      return;
    }
    start(() =>
      router.push(
        urlFiltroMes({
          basePath,
          anio,
          mes,
          ids: [...ids],
          total: opciones.length,
          extra,
        }),
      ),
    );
    cerrar();
  };

  return (
    <SubmenuMenu nombre="Proyectos" icono={<IconoProyecto />}>
      <ListaProyectos
        opciones={opciones}
        seleccionados={sel}
        onCambiar={setSel}
      />
      {/* El botón cierra el menú, y cerrar es lo que aplica. */}
      {vista === "Proyectos" && (
        <button
          type="button"
          onClick={() => aplicar(sel)}
          className="mt-1 w-full rounded-lg bg-dc-peri/15 px-3 py-1.5 text-xs text-dc-peri transition hover:bg-dc-peri/25"
        >
          Listo
        </button>
      )}
    </SubmenuMenu>
  );
}

function IconoProyecto() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h6l2 2h10v10H3z" />
    </svg>
  );
}
