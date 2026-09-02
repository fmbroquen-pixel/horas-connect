"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListaProyectos, type OpcionFiltro } from "@/components/lista-proyectos";
import { SubmenuMenu, useMenuAcciones } from "@/components/ui/menu-acciones";

// "Usuarios →" dentro del menú de la pantalla.
//
// Hermano de SubmenuProyectos y con el mismo comportamiento: multiselección,
// Todos y Limpiar, y se aplica al cerrar. Reemplaza al viejo selector global
// "Registrar horas para", que mezclaba dos cosas distintas —a quién se le
// carga y a quién se está mirando— y solo dejaba ver un mentor por vez.
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
  const router = useRouter();
  const [, start] = useTransition();
  const [sel, setSel] = useState<Set<string>>(new Set(seleccionados));
  const { vista, cerrar } = useMenuAcciones();

  const aplicar = (ids: Set<string>) => {
    const iguales =
      ids.size === seleccionados.length && seleccionados.every((id) => ids.has(id));
    if (iguales) {
      cerrar();
      return;
    }
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(parametros)) if (v) qs.set(k, v);
    // Con todos elegidos (o con ninguno) el filtro no viaja: es el default, y
    // así "sin parámetro" significa siempre lo mismo. Mismo criterio que el
    // filtro de proyectos.
    if (ids.size > 0 && ids.size < opciones.length) {
      qs.set("usuarios", [...ids].join(","));
    } else {
      qs.delete("usuarios");
    }
    start(() => router.push(`${basePath}?${qs.toString()}`));
    cerrar();
  };

  return (
    <SubmenuMenu nombre="Usuarios" icono={<IconoUsuarios />}>
      <ListaProyectos
        titulo="Usuarios"
        opciones={opciones}
        seleccionados={sel}
        onCambiar={setSel}
      />
      {/* El botón cierra el menú, y cerrar es lo que aplica. */}
      {vista === "Usuarios" && (
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

function IconoUsuarios() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
