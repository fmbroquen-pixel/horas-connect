"use client";

import { useState } from "react";
import { ImportarModal } from "./importar-modal";
import { PapeleraModal } from "../papelera/papelera";
import {
  ItemMenu,
  MenuAcciones,
  SeparadorMenu,
  SubmenuMenu,
  ITEM_MENU,
} from "@/components/ui/menu-acciones";
import { SubmenuProyectos } from "@/components/submenu-proyectos";
import type { OpcionFiltro } from "@/components/lista-proyectos";

// Todo lo que no es la tabla, en un solo botón: importar, exportar, filtrar
// por proyecto y papelera. Antes eran tres disparadores distintos en la misma
// barra —acciones, filtro y papelera—, cada uno con su ancho y su hover.
export function AccionesMenu({
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
  // Usuario dueño de las horas cuando un admin opera para otro mentor: se
  // propaga a la importación, a la exportación y al filtro.
  usuarioId?: string;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [papeleraOpen, setPapeleraOpen] = useState(false);

  // La exportación sigue a lo que se está viendo. Con todos los proyectos
  // elegidos no viaja el filtro, igual que en la URL de la pantalla.
  const params = new URLSearchParams({ anio: String(anio), mes: String(mes) });
  if (
    proyectosSeleccionados.length > 0 &&
    proyectosSeleccionados.length < proyectosOpciones.length
  ) {
    params.set("proyectos", proyectosSeleccionados.join(","));
  }
  if (usuarioId) params.set("usuario", usuarioId);
  const url = (formato: string) =>
    `/timetracker/export?${params.toString()}&formato=${formato}`;

  return (
    <>
      <MenuAcciones ancho="w-60">
        <ItemMenu onClick={() => setImportOpen(true)} icono={<IconoImportar />}>
          Importar
        </ItemMenu>

        <SubmenuMenu nombre="Exportar" icono={<IconoExportar />}>
          <a role="menuitem" href={url("xlsx")} className={ITEM_MENU}>
            Excel (.xlsx)
          </a>
          <a role="menuitem" href={url("csv")} className={ITEM_MENU}>
            CSV (.csv)
          </a>
        </SubmenuMenu>

        <SubmenuProyectos
          anio={anio}
          mes={mes}
          basePath="/timetracker"
          opciones={proyectosOpciones}
          seleccionados={proyectosSeleccionados}
          extra={{ usuario: usuarioId || undefined }}
        />

        <SeparadorMenu />

        <ItemMenu onClick={() => setPapeleraOpen(true)} icono={<IconoPapelera />}>
          Papelera
        </ItemMenu>
      </MenuAcciones>

      {importOpen && (
        <ImportarModal onCerrar={() => setImportOpen(false)} usuarioId={usuarioId} />
      )}
      <PapeleraModal tipo="hora" open={papeleraOpen} onClose={() => setPapeleraOpen(false)} />
    </>
  );
}

function IconoImportar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M12 4v12" />
    </svg>
  );
}

function IconoExportar() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
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
