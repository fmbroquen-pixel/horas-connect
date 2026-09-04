"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListaProyectos, type OpcionFiltro } from "@/components/lista-proyectos";
import { SubmenuMenu, useMenuAcciones } from "@/components/ui/menu-acciones";
import { urlConFiltros, type FiltroUrl } from "@/lib/url-filtro";
import { IconoListo } from "@/components/ui/iconos-filtro";
import { FILTRO_CONFIRMAR } from "@/components/ui/filtro-estilos";

export type { OpcionFiltro };

// Un filtro multiselección dentro del menú "⋮" de una pantalla.
//
// Es UNO solo para los tres —Proyectos, Usuarios y Mentor Owner— y no tres
// copias parecidas. Eran copias: el de proyectos y el de usuarios tenían el
// mismo estado, el mismo "aplicar al cerrar" y el mismo botón Listo, y se
// diferenciaban en el nombre del parámetro. Con la tercera copia esa forma se
// volvía insostenible, y cada arreglo había que hacerlo tres veces.
//
// Mientras el menú está abierto la selección es un BORRADOR: se toca sin que
// pase nada. Recién se aplica al confirmar, y confirmar es cualquier forma de
// cerrar que no sea Escape —clic afuera, el botón Listo, el propio ⋮—. Escape
// y "Volver" tiran el borrador y dejan el filtro como estaba.
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
  const { vista, descartar, registrarAplicar } = useMenuAcciones();

  const activo = vista === nombre;

  // Salir del submenú tira el borrador.
  //
  // Se sincroniza en el render y no desde un efecto, que dibujaría el panel dos
  // veces. Sin esto, alguien que elegía tres proyectos, apretaba Escape para
  // volver y entraba de nuevo se encontraba con su selección descartada
  // todavía marcada, y con el filtro real diciendo otra cosa.
  const [eraActivo, setEraActivo] = useState(activo);
  if (activo !== eraActivo) {
    setEraActivo(activo);
    if (!activo) setSel(new Set(seleccionados));
  }

  // Aplicar es navegar. Se compara contra lo que ya está aplicado para no
  // navegar cuando no se cambió nada: sin esto, abrir el menú y cerrarlo sin
  // tocar nada disparaba una consulta entera al servidor.
  const aplicarIds = (ids: Set<string>) => {
    const iguales =
      ids.size === seleccionados.length && seleccionados.every((id) => ids.has(id));
    if (iguales) return;
    navegar(
      urlConFiltros({
        basePath,
        parametros,
        filtros: [...otros, { clave, ids: [...ids], total: opciones.length }],
      }),
    );
  };

  // Mientras este submenú está abierto, el menú sabe cómo confirmarlo. Sin
  // array de dependencias: el efecto tiene que registrar el `sel` de ESTE
  // render, no el del primero.
  useEffect(() => {
    registrarAplicar(nombre, activo ? () => aplicarIds(sel) : null);
  });

  return (
    <SubmenuMenu nombre={nombre} icono={icono}>
      <ListaProyectos
        titulo={nombre}
        opciones={opciones}
        seleccionados={sel}
        onCambiar={setSel}
      />
      {/* Listo cierra sin pasar por la confirmación del menú, porque aplica él
          mismo: dejarlo confirmar además habría navegado dos veces. */}
      {activo && (
        <button
          type="button"
          onClick={() => {
            aplicarIds(sel);
            descartar();
          }}
          data-tooltip="Listo"
          aria-label="Listo"
          className={`${FILTRO_CONFIRMAR} flex w-full items-center justify-center rounded-lg bg-dc-peri/15 px-3 py-1.5 text-dc-peri transition hover:bg-dc-peri/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40`}
        >
          <IconoListo />
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
