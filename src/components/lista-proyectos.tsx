"use client";

import { BTN_ICON_SM } from "@/lib/ui";
import { IconoTodos, IconoLimpiar } from "@/components/ui/iconos-filtro";
import { FILTRO_CABECERA, FILTRO_TITULO } from "@/components/ui/filtro-estilos";

export type OpcionFiltro = { id: string; nombre: string };

// La multiselección de proyectos, sin decidir dónde vive.
//
// La usan los cuatro módulos que filtran -Time Tracking, Expenses, Home CORE
// y Analytics- para Proyectos, Usuarios y Mentor Owner. Es controlada a
// propósito: quién guarda la selección la mantiene como borrador mientras el
// menú está abierto, pero la lista se ve y se toca igual en todos.
//
// Sin checkbox: cada fila se prende y apaga con un clic y el estado se lee del
// fondo, el borde y un check. Ocupa menos ancho y se escanea mejor en una
// lista larga.
export function ListaProyectos({
  opciones,
  seleccionados,
  onCambiar,
  titulo = "Proyectos",
}: {
  opciones: OpcionFiltro[];
  seleccionados: Set<string>;
  onCambiar: (ids: Set<string>) => void;
  // Lo único que cambia entre el filtro de proyectos y el de usuarios: la
  // lista se ve y se toca igual, y conviene que siga siendo así.
  titulo?: string;
}) {
  const todos = opciones.length > 0 && seleccionados.size === opciones.length;

  const alternar = (id: string) => {
    const n = new Set(seleccionados);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    onCambiar(n);
  };

  return (
    <>
      <div className={FILTRO_CABECERA}>
        <span className={FILTRO_TITULO}>{titulo}</span>
        {/* Solo ícono. Los nombres siguen estando en el tooltip y en el
            aria-label: en una lista angosta el texto se llevaba media fila del
            encabezado, y con "Mentor Owner" de título los dos botones no
            entraban en la misma línea. */}
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => onCambiar(new Set(opciones.map((o) => o.id)))}
            disabled={todos}
            data-tooltip="Todos"
            aria-label="Seleccionar todos"
            className={`${BTN_ICON_SM} p-1`}
          >
            <IconoTodos size={14} />
          </button>
          <button
            type="button"
            onClick={() => onCambiar(new Set())}
            disabled={seleccionados.size === 0}
            data-tooltip="Limpiar"
            aria-label="Limpiar la selección"
            className={`${BTN_ICON_SM} p-1`}
          >
            <IconoLimpiar size={14} />
          </button>
        </span>
      </div>

      <div className="max-h-56 space-y-1 overflow-y-auto overflow-x-hidden">
        {opciones.map((o) => {
          const activo = seleccionados.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => alternar(o.id)}
              aria-pressed={activo}
              data-tooltip={o.nombre}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                activo
                  ? "border-dc-peri/60 bg-dc-peri/15 text-dc-text"
                  : "border-transparent text-dc-muted hover:bg-dc-line/40 hover:text-dc-text"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{o.nombre}</span>
              {activo && <IconoCheck />}
            </button>
          );
        })}
        {opciones.length === 0 && (
          <p className="px-1 py-2 text-xs text-dc-muted">
            No tenés proyectos asignados.
          </p>
        )}
      </div>
    </>
  );
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-dc-peri">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
