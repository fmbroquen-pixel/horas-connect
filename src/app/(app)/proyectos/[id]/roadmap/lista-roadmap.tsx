"use client";

import { useId, useRef, useState } from "react";
import { duplicarLista, eliminarLista, renombrarLista } from "./actions";
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  GRID_ROADMAP,
  progresoLista,
  type ListaRoadmapVista,
} from "./constantes";
import { FilaTareaRoadmap } from "./fila-tarea";
import { NuevaTareaBoton } from "./nueva-tarea-boton";
import { BTN_ICON_SM } from "@/lib/ui";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
} from "@/components/tabla/acciones-fila";

// Una lista del plan sobre la superficie clara del Design System (.dc-panel),
// igual que las tablas de Time Tracking o Equipo: de ahí salen el encabezado
// centrado y las filas blancas. Arranca plegada: un roadmap largo se recorre
// primero por sus listas y se abre la que interesa.
export function ListaRoadmapCard({
  lista,
  sel,
  onToggle,
  onToggleLista,
}: {
  lista: ListaRoadmapVista;
  sel: Set<string>;
  onToggle: (id: string) => void;
  onToggleLista: (ids: string[], marcar: boolean) => void;
}) {
  // Plegadas por defecto: un roadmap largo se recorre primero por sus listas.
  const [abierta, setAbierta] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const idContenido = useId();

  // Avance y estado se derivan de las tareas en cada render: cualquier cambio
  // (editar un estado, agregar o borrar una tarea) los actualiza solo.
  const avance = progresoLista(lista.tareas);

  const ids = lista.tareas.map((t) => t.id);
  const seleccionadas = ids.filter((id) => sel.has(id)).length;
  const todasSel = ids.length > 0 && seleccionadas === ids.length;

  return (
    <section className="dc-panel overflow-hidden">
      {/* Todo el header pliega y despliega. Los controles que hacen otra cosa
          (renombrar, duplicar, eliminar) frenan la propagación para no
          arrastrar el desplegable con ellos. */}
      <header
        onClick={() => setAbierta((v) => !v)}
        className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-b border-dc-line px-4 py-3 transition hover:bg-dc-card/60"
      >
        {renombrando ? (
          <span onClick={(e) => e.stopPropagation()}>
            <FormNombre lista={lista} onCerrar={() => setRenombrando(false)} />
          </span>
        ) : (
          <>
            {/* Sin onClick propio: el click (y Enter/Espacio, que en un
                <button> emiten click) burbujea al header y pliega una sola
                vez. Queda accesible por teclado y anuncia su estado. */}
            <button
              type="button"
              aria-expanded={abierta}
              aria-controls={idContenido}
              className="flex items-center gap-2 rounded-lg text-left transition hover:text-dc-peri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`shrink-0 transition-transform duration-150 ${abierta ? "" : "-rotate-90"}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <h3 className="font-display text-sm uppercase leading-none text-dc-text">
                {lista.nombre}
              </h3>
            </button>
            <span className="text-xs leading-none text-dc-muted">
              {lista.tareas.length} tarea(s)
              {seleccionadas > 0 && ` · ${seleccionadas} seleccionada(s)`}
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <BotonEditarIcono
                onClick={() => setRenombrando(true)}
                label="Renombrar lista"
              />
            </span>
          </>
        )}

        {/* Estado + avance: todo sobre la misma línea óptica (items-center y
            leading-none), para que el punto, el texto, la barra y el
            porcentaje no queden escalonados. */}
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs leading-none text-dc-muted">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_ESTADO[avance.estado] }}
            />
            {ETIQUETA_ESTADO[avance.estado]}
          </span>

          <span
            className="flex items-center gap-2"
            title={`${avance.resueltas} de ${avance.total} tarea(s) resueltas (finalizadas o no ejecutadas)`}
          >
            <span
              role="progressbar"
              aria-valuenow={avance.porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Avance de ${lista.nombre}`}
              className="block h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-dc-line sm:w-32"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${avance.porcentaje}%`,
                  backgroundColor: COLOR_ESTADO[avance.estado],
                }}
              />
            </span>
            <span className="w-9 text-right text-xs leading-none tabular-nums text-dc-muted">
              {avance.porcentaje}%
            </span>
          </span>
        </span>

        <span
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          <BotonIcono
            label="Duplicar lista"
            onClick={() => duplicarLista(lista.id)}
            path="M9 9h10v10H9zM5 15V5h10"
          />
          <BotonEliminarIcono
            onConfirm={() => eliminarLista(lista.id)}
            label="Eliminar lista"
          />
        </span>
      </header>

      {abierta && (
        <div id={idContenido}>
          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div className={`dc-thead ${GRID_ROADMAP} border-b border-dc-line px-4`}>
                <input
                  type="checkbox"
                  checked={todasSel}
                  onChange={() => onToggleLista(ids, !todasSel)}
                  disabled={ids.length === 0}
                  className="h-4 w-4 accent-dc-purple"
                  aria-label={`Seleccionar todas las tareas de ${lista.nombre}`}
                />
                <span className="dc-col-izq">Tarea</span>
                <span>Inicio</span>
                <span>Fin</span>
                <span>Horas est.</span>
                <span>Estado</span>
                <span />
              </div>

              {lista.tareas.map((t) => (
                <FilaTareaRoadmap
                  key={t.id}
                  tarea={t}
                  seleccionada={sel.has(t.id)}
                  onToggle={onToggle}
                />
              ))}

              {lista.tareas.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-dc-muted">
                  Esta lista todavía no tiene tareas.
                </div>
              )}
            </div>
          </div>

          {/* Alta al pie de la lista, fuera del scroll horizontal para que
              ocupe siempre el ancho visible de la card. */}
          <NuevaTareaBoton listaId={lista.id} />
        </div>
      )}
    </section>
  );
}

// El nombre de la lista sigue la misma regla que las celdas de la tabla:
// se guarda al salir del campo o con Enter, Escape cancela, sin botones.
function FormNombre({
  lista,
  onCerrar,
}: {
  lista: ListaRoadmapVista;
  onCerrar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const cancelado = useRef(false);

  const guardar = async (valor: string) => {
    const nombre = valor.trim();
    if (!nombre || nombre === lista.nombre) {
      onCerrar();
      return;
    }
    setGuardando(true);
    const fd = new FormData();
    fd.set("nombre", nombre);
    const r = await renombrarLista(lista.id, undefined, fd);
    setGuardando(false);
    if (r.error) setError(r.error);
    else onCerrar();
  };

  return (
    <span className="flex items-center gap-2">
      <input
        defaultValue={lista.nombre}
        aria-label="Nombre de la lista"
        autoComplete="off"
        autoFocus
        disabled={guardando}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelado.current = true;
            onCerrar();
          }
        }}
        onBlur={(e) => {
          if (cancelado.current) {
            cancelado.current = false;
            return;
          }
          guardar(e.target.value);
        }}
        className="w-56 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri disabled:opacity-50"
      />
      {error && (
        <span role="alert" className="text-xs text-dc-pink">
          {error}
        </span>
      )}
    </span>
  );
}

function BotonIcono({
  label,
  onClick,
  path,
}: {
  label: string;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={BTN_ICON_SM}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );
}
