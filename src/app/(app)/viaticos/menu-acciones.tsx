"use client";

import { useState } from "react";
import { PapeleraModal } from "../papelera/papelera";
import { ItemMenu, MenuAcciones, SeparadorMenu } from "@/components/ui/menu-acciones";
import { SubmenuProyectos } from "@/components/submenu-proyectos";
import type { OpcionFiltro } from "@/components/lista-proyectos";

// El mismo menú que Time Tracking, con lo que Expenses tiene: filtrar por
// proyecto y papelera. Comparte componente, así que el ancho, el padding y el
// hover son los mismos sin tener que acordarse de copiarlos.
export function AccionesViaticos({
  anio,
  mes,
  proyectosOpciones,
  proyectosSeleccionados,
  usuarioId = "",
}: {
  anio: number;
  mes: number;
  proyectosOpciones: OpcionFiltro[];
  proyectosSeleccionados: string[];
  usuarioId?: string;
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
          extra={{ usuario: usuarioId || undefined }}
        />

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
