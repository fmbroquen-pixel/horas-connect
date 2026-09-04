"use client";

import { SubmenuFiltro } from "@/components/submenu-filtro";
import type { OpcionFiltro } from "@/components/lista-proyectos";
import { IconoProyecto } from "@/components/ui/icono-proyecto";

// "Proyectos →" dentro del menú de la pantalla.
//
// La forma la pone SubmenuFiltro; acá solo queda el nombre del parámetro y el
// ícono. Antes era una copia entera del de usuarios.
export function SubmenuProyectos({
  anio,
  mes,
  basePath,
  opciones,
  seleccionados,
  extra,
  navegar,
}: {
  anio: number;
  mes: number;
  basePath: string;
  opciones: OpcionFiltro[];
  seleccionados: string[];
  extra?: Record<string, string | undefined>;
  navegar?: (url: string) => void;
}) {
  return (
    <SubmenuFiltro
      nombre="Proyectos"
      icono={<IconoProyecto />}
      clave="proyectos"
      basePath={basePath}
      parametros={{ anio, mes, ...(extra ?? {}) }}
      opciones={opciones}
      seleccionados={seleccionados}
      navegar={navegar}
    />
  );
}
