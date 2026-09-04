"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListaProyectos, type OpcionFiltro } from "@/components/lista-proyectos";
import { SubmenuMenu, useMenuAcciones } from "@/components/ui/menu-acciones";
import { urlConFiltros, type FiltroUrl } from "@/lib/url-filtro";

export type { OpcionFiltro };

// Un filtro multiselección dentro del menú "⋮" de una pantalla.
//
// Es UNO solo para los tres —Proyectos, Usuarios y Mentor Owner— y no tres
// copias parecidas. Eran copias: el de proyectos y el de usuarios tenían el
// mismo estado, el mismo "aplicar al cerrar" y el mismo botón Listo, y se
// diferenciaban en el nombre del parámetro. Con la tercera copia esa forma se
// volvía insostenible, y cada arreglo había que hacerlo tres veces.
//
// Se aplica al cerrar, igual que el resto de los filtros de CORE. No hay
// ningún cartel que lo diga: el resultado se ve en pantalla al instante y el
// aviso ocupaba una línea para explicar algo que se entiende usándolo una vez.
export function SubmenuFiltro({
  nombre,
  icono,
  clave,
  basePath,
  parametros,
  // Los OTROS filtros de la pantalla, para que elegir acá no los borre.
  otros = [],
  opciones,
  seleccionados,
  navegar: navegarExterno,
}: {
  nombre: string;
  icono?: React.ReactNode;
  // El nombre del parámetro en la URL.
  clave: string;
  basePath: string;
  // Lo que no es filtro y hay que conservar: el mes, o el usuario para el que
  // un admin está cargando.
  parametros: Record<string, string | number | undefined>;
  otros?: FiltroUrl[];
  opciones: OpcionFiltro[];
  seleccionados: string[];
  // Cómo navegar. Home y Analytics pasan el suyo para que los bloques muestren
  // su spinner mientras el servidor recalcula.
  navegar?: (url: string) => void;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const navegar = navegarExterno ?? ((url: string) => start(() => router.push(url)));
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const { vista, cerrar } = useMenuAcciones();

  // Al salir del submenú se aplica lo elegido. Se compara contra lo que ya
  // está aplicado para no navegar cuando no se cambió nada.
  const aplicar = (ids: Set<string>) => {
    const iguales =
      ids.size === seleccionados.length && seleccionados.every((id) => ids.has(id));
    cerrar();
    if (iguales) return;
    navegar(
      urlConFiltros({
        basePath,
        parametros,
        filtros: [...otros, { clave, ids: [...ids], total: opciones.length }],
      }),
    );
  };

  return (
    <SubmenuMenu nombre={nombre} icono={icono}>
      <ListaProyectos
        titulo={nombre}
        opciones={opciones}
        seleccionados={sel}
        onCambiar={setSel}
      />
      {/* El botón cierra el menú, y cerrar es lo que aplica. */}
      {vista === nombre && (
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

export function IconoUsuarios({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// El Mentor Owner es una persona, pero no cualquiera: la responsable del
// proyecto. La estrella lo separa del filtro de usuarios de Time Tracking, que
// pregunta otra cosa -quién cargó las horas- y usa la silueta doble.
export function IconoOwner({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M18 2.5l1.3 2.7 2.9.4-2.1 2.1.5 2.9L18 9.2l-2.6 1.4.5-2.9-2.1-2.1 2.9-.4z" />
    </svg>
  );
}
