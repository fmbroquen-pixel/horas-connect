"use client";

import { useActionState, useState } from "react";
import { duplicarLista, eliminarLista, moverLista, renombrarLista } from "./actions";
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

// Una lista del plan: cabecera con nombre editable y acciones, subtotal de
// horas y la tabla de tareas. La tabla no lleva scroll propio — el scroll es
// de la columna de listas, para que el plan se lea de corrido.
export function ListaRoadmapCard({
  lista,
  primera,
  ultima,
}: {
  lista: ListaRoadmapVista;
  primera: boolean;
  ultima: boolean;
}) {
  const [renombrando, setRenombrando] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-dc-line bg-dc-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-dc-line px-4 py-3">
        {renombrando ? (
          <FormNombre lista={lista} onCerrar={() => setRenombrando(false)} />
        ) : (
          <>
            <h3 className="font-display text-sm uppercase text-white">
              {lista.nombre}
            </h3>
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
            label="Subir lista"
            disabled={primera}
            onClick={() => moverLista(lista.id, -1)}
            path="M18 15l-6-6-6 6"
          />
          <BotonIcono
            label="Bajar lista"
            disabled={ultima}
            onClick={() => moverLista(lista.id, 1)}
            path="M6 9l6 6 6-6"
          />
          <BotonIcono
            label="Duplicar lista"
            onClick={() => duplicarLista(lista.id)}
            path="M9 9h10v10H9zM5 15V5h10"
          />
          <BotonEliminarIcono
            onConfirm={() => eliminarLista(lista.id)}
            label="Eliminar lista"
          />
          <NuevaTareaBoton listaId={lista.id} />
        </span>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className={`dc-thead ${GRID_ROADMAP} border-b border-dc-line px-4`}>
            <span>Tarea</span>
            <span>Inicio</span>
            <span>Fin</span>
            <span>Duración</span>
            <span>Horas est.</span>
            <span>Estado</span>
            <span />
          </div>

          {lista.tareas.map((t, i) => (
            <FilaTareaRoadmap
              key={t.id}
              tarea={t}
              primera={i === 0}
              ultima={i === lista.tareas.length - 1}
            />
          ))}

          {lista.tareas.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-dc-muted">
              Esta lista todavía no tiene tareas.
            </p>
          )}
        </div>
      </div>
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
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  path: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${BTN_ICON_SM} disabled:cursor-not-allowed disabled:opacity-35`}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );
}
