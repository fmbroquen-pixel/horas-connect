"use client";

import { useState } from "react";
import { PapeleraModal } from "../papelera/papelera";
import { ItemMenu, MenuAcciones, SeparadorMenu } from "@/components/ui/menu-acciones";
import { SubmenuProyectos } from "@/components/submenu-proyectos";
import { SubmenuUsuarios } from "@/components/submenu-usuarios";
import type { OpcionFiltro } from "@/components/lista-proyectos";

// El mismo menú que Time Tracking, con lo que Expenses tiene: filtrar por
// proyecto y papelera. Comparte componente, así que el ancho, el padding y el
// hover son los mismos sin tener que acordarse de copiarlos.
export function AccionesViaticos({
  anio,
  mes,
  proyectosOpciones,
  proyectosSeleccionados,
  usuariosOpciones,
  usuariosSeleccionados,
}: {
  anio: number;
  mes: number;
  proyectosOpciones: OpcionFiltro[];
  proyectosSeleccionados: string[];
  // Vacío para un mentor: se ve a sí mismo y no hay nada que filtrar.
  usuariosOpciones: OpcionFiltro[];
  usuariosSeleccionados: string[];
}) {
  const [papeleraOpen, setPapeleraOpen] = useState(false);

  return (
    <>
      <MenuAcciones ancho="w-60">
        <SubmenuProyectos
          anio={anio}
          mes={mes}
          basePath="/viaticos"
          opciones={proyectosOpciones}
          seleccionados={proyectosSeleccionados}
          extra={{
            usuarios:
              usuariosSeleccionados.length > 0 &&
              usuariosSeleccionados.length < usuariosOpciones.length
                ? usuariosSeleccionados.join(",")
                : undefined,
          }}
        />

        {/* Solo para quien ve a más de uno: a un mentor no le sirve un filtro
            con una única opción que además es él. */}
        {usuariosOpciones.length > 1 && (
          <SubmenuUsuarios
            basePath="/viaticos"
            parametros={{
              anio: String(anio),
              mes: String(mes),
              proyectos:
                proyectosSeleccionados.length > 0 &&
                proyectosSeleccionados.length < proyectosOpciones.length
                  ? proyectosSeleccionados.join(",")
                  : undefined,
            }}
            opciones={usuariosOpciones}
            seleccionados={usuariosSeleccionados}
          />
        )}

        <SeparadorMenu />

        <ItemMenu onClick={() => setPapeleraOpen(true)} icono={<IconoPapelera />}>
          Papelera
        </ItemMenu>
      </MenuAcciones>

      <PapeleraModal
        tipo="viatico"
        open={papeleraOpen}
        onClose={() => setPapeleraOpen(false)}
      />
    </>
  );
}

function IconoPapelera() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
