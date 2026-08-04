"use client";

import { useActionState, useState } from "react";
import { actualizarTarea, eliminarTarea } from "./actions";
import {
  GRID_ROADMAP,
  ETIQUETA_ESTADO,
  COLOR_ESTADO,
  OPCIONES_ESTADO,
  type TareaRoadmapFila,
} from "./constantes";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import {
  diasHabilesEntre,
  fechaDesdeISO,
  finTrasDiasHabiles,
  isoDesdeFecha,
} from "@/lib/dias-habiles";
import { reformatEntradaHoras } from "@/lib/horas";
import {
  BotonEditarIcono,
  BotonEliminarIcono,
  BotonGuardarIcono,
  BotonCancelarIcono,
} from "@/components/tabla/acciones-fila";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaTareaRoadmap({ tarea }: { tarea: TareaRoadmapFila }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <FormEdicion tarea={tarea} onCerrar={() => setEditando(false)} />;
  }

  return (
    <div className="border-b border-dc-line px-4 py-3 last:border-0">
      <div className={GRID_ROADMAP}>
        {/* El nombre alineado a la izquierda: es la columna de texto largo y
            así se recorre la lista leyendo por el borde. El resto, centrado. */}
        <span className="truncate text-left text-sm text-dc-text" title={tarea.nombre}>
          {tarea.nombre}
        </span>
        <span className="text-center text-sm tabular-nums text-dc-text">
          {mostrarFechaISO(tarea.fechaInicio)}
        </span>
        <span className="text-center text-sm tabular-nums text-dc-text">
          {mostrarFechaISO(tarea.fechaFin)}
        </span>
        <span className="text-center text-sm tabular-nums text-dc-muted">
          {tarea.duracionDias} d
        </span>
        <span className="text-center text-sm tabular-nums text-dc-text">
          {tarea.horasEstimadas}
        </span>
        <span className="flex items-center justify-center gap-1.5 text-sm text-dc-muted">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: COLOR_ESTADO[tarea.estado] }}
          />
          {ETIQUETA_ESTADO[tarea.estado] ?? tarea.estado}
        </span>
        <span className="flex justify-center gap-1">
          <BotonEditarIcono onClick={() => setEditando(true)} label="Editar tarea" />
          <BotonEliminarIcono
            onConfirm={() => eliminarTarea(tarea.id)}
            label="Eliminar tarea"
          />
        </span>
      </div>
    </div>
  );
}

// Inicio, duración y fin son tres vistas del mismo dato: el usuario edita
// cualquiera de los tres y los otros dos se recalculan en días hábiles. Al
// servidor se le mandan inicio y duración, que son los campos que mandan; el
// fin lo vuelve a derivar ahí para no depender del cálculo del navegador.
function FormEdicion({
  tarea,
  onCerrar,
}: {
  tarea: TareaRoadmapFila;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(tarea.nombre);
  const [inicio, setInicio] = useState(tarea.fechaInicio);
  const [duracion, setDuracion] = useState(String(tarea.duracionDias));
  const [fin, setFin] = useState(tarea.fechaFin);
  const [horas, setHoras] = useState(tarea.horasEstimadas);
  const [estado, setEstado] = useState(tarea.estado);

  const accion = actualizarTarea.bind(null, tarea.id);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
      if (!r.error) onCerrar();
      return r;
    },
    undefined,
  );

  const recalcularFin = (inicioISO: string, dias: string) => {
    const n = Number(dias);
    if (!inicioISO || !Number.isInteger(n) || n < 1) return;
    setFin(isoDesdeFecha(finTrasDiasHabiles(fechaDesdeISO(inicioISO), n)));
  };

  const cambiarInicio = (v: string) => {
    setInicio(v);
    recalcularFin(v, duracion);
  };

  const cambiarDuracion = (v: string) => {
    setDuracion(v);
    recalcularFin(inicio, v);
  };

  // Editar el fin es otra forma de fijar la duración: se cuenta cuántos días
  // hábiles quedan entre inicio y el fin elegido.
  const cambiarFin = (v: string) => {
    setFin(v);
    if (!inicio || !v || v < inicio) return;
    setDuracion(String(diasHabilesEntre(fechaDesdeISO(inicio), fechaDesdeISO(v))));
  };

  return (
    <form
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-4 py-3 last:border-0"
    >
      <input type="hidden" name="duracionDias" value={duracion} />
      <div className={GRID_ROADMAP}>
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-label="Nombre de la tarea"
          autoComplete="off"
          required
          className={INPUT}
        />
        <DatePicker
          name="fechaInicio"
          value={inicio}
          onChange={cambiarInicio}
          rangeStart={inicio}
          rangeEnd={fin}
          className="w-full"
          ariaLabel="Fecha de inicio"
        />
        <DatePicker
          value={fin}
          onChange={cambiarFin}
          rangeStart={inicio}
          rangeEnd={fin}
          min={inicio || undefined}
          className="w-full"
          ariaLabel="Fecha de fin"
        />
        <input
          value={duracion}
          onChange={(e) => cambiarDuracion(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          aria-label="Duración en días hábiles"
          title="Días hábiles (lunes a viernes)"
          className={`${INPUT} text-center`}
        />
        <input
          name="horasEstimadas"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          onBlur={() => {
            const f = reformatEntradaHoras(horas);
            if (f) setHoras(f);
          }}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Horas estimadas"
          title="Cargá un número (1,5) o el formato 1:30"
          className={`${INPUT} text-center`}
        />
        <Dropdown
          name="estado"
          value={estado}
          onChange={setEstado}
          options={OPCIONES_ESTADO}
          ariaLabel="Estado"
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
