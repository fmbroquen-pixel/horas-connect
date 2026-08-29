"use client";

import { BTN_SECONDARY_SM } from "@/lib/ui";

export type OpcionFiltro = { id: string; nombre: string };

// La multiselección de proyectos, sin decidir dónde vive.
//
// La usan el filtro del Home (en su propio popover) y el submenú "Proyectos"
// de Time Tracking y Expenses. Es controlada a propósito: quién guarda la
// selección y cuándo se aplica cambia según el lugar, pero la lista se ve y se
// toca igual en los tres.
//
// Sin checkbox: cada fila se prende y apaga con un clic y el estado se lee del
// fondo, el borde y un check. Ocupa menos ancho y se escanea mejor en una
// lista larga.
export function ListaProyectos({
  opciones,
  seleccionados,
  onCambiar,
}: {
  opciones: OpcionFiltro[];
  seleccionados: Set<string>;
  onCambiar: (ids: Set<string>) => void;
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
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <span className="text-xs uppercase tracking-wide text-dc-muted">
          Proyectos
        </span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => onCambiar(new Set(opciones.map((o) => o.id)))}
            disabled={todos}
            className={`${BTN_SECONDARY_SM} disabled:opacity-40`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onCambiar(new Set())}
            disabled={seleccionados.size === 0}
            className={`${BTN_SECONDARY_SM} disabled:opacity-40`}
          >
            Limpiar
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
