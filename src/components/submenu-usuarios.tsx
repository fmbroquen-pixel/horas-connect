"use client";

import { SubmenuFiltro, IconoUsuarios } from "@/components/submenu-filtro";
import type { OpcionFiltro } from "@/components/lista-proyectos";

// "Usuarios →" dentro del menú de Time Tracking y Expenses.
//
// Filtra por quién CARGÓ las horas, que no es lo mismo que el Mentor Owner del
// proyecto: uno es quien reportó y el otro quien responde por el cliente.
// Reemplaza al viejo selector global "Registrar horas para", que mezclaba dos
// cosas distintas —a quién se le carga y a quién se está mirando— y solo dejaba
// ver un mentor por vez.
export function SubmenuUsuarios({
  basePath,
  parametros,
  opciones,
  seleccionados,
}: {
  basePath: string;
  // El resto del querystring, ya resuelto por quien llama: acá solo se
  // reemplaza `usuarios`. Es más simple que reconstruir mes y proyectos, y
  // evita que este submenú tenga que saber de los otros filtros.
  parametros: Record<string, string | undefined>;
  opciones: OpcionFiltro[];
  seleccionados: string[];
}) {
  return (
    <SubmenuFiltro
      nombre="Usuarios"
      icono={<IconoUsuarios />}
      clave="usuarios"
      basePath={basePath}
      parametros={parametros}
      opciones={opciones}
      seleccionados={seleccionados}
    />
  );
}
