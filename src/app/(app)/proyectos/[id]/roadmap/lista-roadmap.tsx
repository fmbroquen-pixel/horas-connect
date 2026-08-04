"use client";

import { useActionState, useId, useState } from "react";
import { duplicarLista, eliminarLista, renombrarLista } from "./actions";
import { GRID_ROADMAP, type ListaRoadmapVista } from "./constantes";
import { FilaTareaRoadmap } from "./fila-tarea";
import { NuevaTareaBoton } from "./nueva-tarea-boton";
import { formatHorasHsMin } from "@/lib/horas";
import { BTN_ICON_SM } from "@/lib/ui";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
  BotonGuardarIcono,
  BotonCancelarIcono,
} from "@/components/tabla/acciones-fila";

// Una lista del plan sobre la superficie clara del Design System (.dc-panel),
// igual que las tablas de Time Tracking o Equipo: de ahí salen el encabezado
// centrado y las filas blancas. Se pliega para poder recorrer un roadmap
// largo viendo solo los títulos; arranca abierta.
export function ListaRoadmapCard({ lista }: { lista: ListaRoadmapVista }) {
  const [abierta, setAbierta] = useState(true);
  const [renombrando, setRenombrando] = useState(false);
  const idContenido = useId();

  return (
    <section className="dc-panel overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-dc-line px-4 py-3">
        {renombrando ? (
          <FormNombre lista={lista} onCerrar={() => setRenombrando(false)} />
        ) : (
          <>
            {/* El plegado es el propio título: objetivo de clic grande y con
                el estado anunciado para lectores de pantalla. */}
            <button
              type="button"
              onClick={() => setAbierta((v) => !v)}
              aria-expanded={abierta}
              aria-controls={idContenido}
              className="flex items-center gap-2 rounded-lg py-0.5 pr-2 text-left transition hover:text-dc-peri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dc-peri/40"
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
              <h3 className="font-display text-sm uppercase text-dc-text">
                {lista.nombre}
              </h3>
            </button>
            <span className="text-xs text-dc-muted">
              {lista.tareas.length} tarea(s)
            </span>
            <BotonEditarIcono
              onClick={() => setRenombrando(true)}
              label="Renombrar lista"
            />
          </>
        )}

        <span className="ml-auto flex items-center gap-3 text-xs text-dc-muted">
          <span title="Horas estimadas de la lista">
            {formatHorasHsMin(lista.horasEstimadas)} planificadas
          </span>
          <span title="Horas de las tareas finalizadas">
            {formatHorasHsMin(lista.horasEntregadas)} entregadas
          </span>
        </span>

        <span className="flex items-center gap-1">
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
            <div className="min-w-[900px]">
              <div className={`dc-thead ${GRID_ROADMAP} border-b border-dc-line px-4`}>
                <span className="dc-col-izq">Tarea</span>
                <span>Inicio</span>
                <span>Fin</span>
                <span>Duración</span>
                <span>Horas est.</span>
                <span>Estado</span>
                <span />
              </div>

              {lista.tareas.map((t) => (
                <FilaTareaRoadmap key={t.id} tarea={t} />
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

function FormNombre({
  lista,
  onCerrar,
}: {
  lista: ListaRoadmapVista;
  onCerrar: () => void;
}) {
  const accion = renombrarLista.bind(null, lista.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
      if (!r.error) onCerrar();
      return r;
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="nombre"
        defaultValue={lista.nombre}
        aria-label="Nombre de la lista"
        autoComplete="off"
        autoFocus
        required
        className="w-56 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <BotonGuardarIcono pending={pending} />
      <BotonCancelarIcono onClick={onCerrar} />
      {state?.error && <span className="text-xs text-dc-pink">{state.error}</span>}
    </form>
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
