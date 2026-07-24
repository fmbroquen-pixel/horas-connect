"use client";

import { useActionState, useState } from "react";
import { actualizarTarea, eliminarTarea } from "../../actions";
import {
  GRID_TAREAS,
  ETIQUETA_ESTADO_TAREA,
  COLOR_ESTADO_TAREA,
  OPCIONES_ESTADO_TAREA,
  type TareaFila,
} from "../../constantes";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
  BotonGuardarIcono,
  BotonCancelarIcono,
} from "@/components/tabla/acciones-fila";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

// Fila del cronograma con edición inline, mismo patrón que el resto de las
// tablas editables de la app.
export function FilaTarea({ tarea }: { tarea: TareaFila }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="border-b border-dc-line px-4 py-3 last:border-0">
        <div className={GRID_TAREAS}>
          <span className="truncate text-center text-sm text-dc-text" title={tarea.titulo}>
            {tarea.titulo}
          </span>
          <span className="text-center text-sm tabular-nums text-dc-text">
            {mostrarFechaISO(tarea.fechaInicio)}
          </span>
          <span className="text-center text-sm tabular-nums text-dc-text">
            {mostrarFechaISO(tarea.fechaFin)}
          </span>
          <span className="flex items-center justify-center gap-1.5 text-sm text-dc-muted">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_ESTADO_TAREA[tarea.estado] }}
            />
            {ETIQUETA_ESTADO_TAREA[tarea.estado] ?? tarea.estado}
          </span>
          <span className="truncate text-center text-sm text-dc-muted">
            {tarea.responsable || "—"}
          </span>
          <span className="flex justify-center gap-1">
            <BotonEditarIcono onClick={() => setEditando(true)} label="Editar tarea" />
            <BotonEliminarIcono onConfirm={() => eliminarTarea(tarea.id)} label="Eliminar tarea" />
          </span>
        </div>
      </div>
    );
  }

  return <FormEdicion tarea={tarea} onCerrar={() => setEditando(false)} />;
}

function FormEdicion({
  tarea,
  onCerrar,
}: {
  tarea: TareaFila;
  onCerrar: () => void;
}) {
  const [inicio, setInicio] = useState(tarea.fechaInicio);
  const [fin, setFin] = useState(tarea.fechaFin);
  const [estado, setEstado] = useState(tarea.estado);
  const accion = actualizarTarea.bind(null, tarea.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await accion(prev, formData);
      if (!result.error) onCerrar();
      return result;
    },
    undefined,
  );

  const setInicioSeguro = (v: string) => {
    setInicio(v);
    if (fin && v && fin < v) setFin(v);
  };

  return (
    <form
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-4 py-3 last:border-0"
    >
      <div className={GRID_TAREAS}>
        <input
          name="titulo"
          defaultValue={tarea.titulo}
          aria-label="Título"
          autoComplete="off"
          required
          className={INPUT}
        />
        <DatePicker
          name="fechaInicio"
          value={inicio}
          onChange={setInicioSeguro}
          rangeStart={inicio}
          rangeEnd={fin}
          className="w-full"
          ariaLabel="Fecha de inicio"
        />
        <DatePicker
          name="fechaFin"
          value={fin}
          onChange={setFin}
          rangeStart={inicio}
          rangeEnd={fin}
          min={inicio || undefined}
          className="w-full"
          ariaLabel="Fecha de fin"
        />
        <Dropdown
          name="estado"
          value={estado}
          onChange={setEstado}
          options={OPCIONES_ESTADO_TAREA}
          ariaLabel="Estado"
        />
        <input
          name="responsable"
          defaultValue={tarea.responsable}
          aria-label="Responsable"
          autoComplete="off"
          className={INPUT}
        />
        <span className="flex justify-center gap-1">
          <BotonGuardarIcono pending={pending} />
          <BotonCancelarIcono onClick={onCerrar} />
        </span>
      </div>
      {state?.error && <p className="mt-2 text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}
