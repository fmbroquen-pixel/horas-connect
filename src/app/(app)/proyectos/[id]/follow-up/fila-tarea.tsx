"use client";

import { actualizarCampoTarea, eliminarTarea } from "./actions";
import {
  GRID_ROADMAP,
  ETIQUETA_ESTADO,
  COLOR_ESTADO,
  OPCIONES_ESTADO,
  type TareaRoadmapFila,
} from "./constantes";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import {
  CeldaFecha,
  CeldaHoras,
  CeldaOpciones,
  CeldaTexto,
} from "@/components/tabla/celda-editable";
import { BotonEliminarIcono } from "@/components/tabla/acciones-fila";
import { SelectorPersonas } from "./selector-personas";

// Fila del plan con edición inline: cada celda se guarda sola al salir o con
// Enter. Cambiar Inicio o Fin recalcula, en el servidor, únicamente las
// tareas posteriores.
export function FilaTareaRoadmap({
  tarea,
  seleccionada,
  onToggle,
}: {
  tarea: TareaRoadmapFila;
  seleccionada: boolean;
  onToggle: (id: string) => void;
}) {
  const guardar = (campo: Parameters<typeof actualizarCampoTarea>[1]) =>
    async (valor: string) => actualizarCampoTarea(tarea.id, campo, valor);

  return (
    <div className="border-b border-dc-line px-4 py-2 last:border-0">
      <div className={GRID_ROADMAP}>
        <input
          type="checkbox"
          checked={seleccionada}
          onChange={() => onToggle(tarea.id)}
          className="h-4 w-4 accent-dc-purple"
          aria-label={`Seleccionar ${tarea.nombre}`}
        />

        {/* Columna de texto largo: alineada a la izquierda, como el header.
            Las personas van pegadas al nombre porque califican a la tarea; no
            merecen una columna propia. */}
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1">
            <CeldaTexto
              valor={tarea.nombre}
              onGuardar={guardar("nombre")}
              ariaLabel="Nombre de la tarea"
              alinear="izquierda"
            />
          </span>
          <SelectorPersonas tareaId={tarea.id} personas={tarea.personas} />
        </span>

        <CeldaFecha
          valor={tarea.fechaInicio}
          onGuardar={guardar("fechaInicio")}
          ariaLabel="Fecha de inicio"
          mostrar={mostrarFechaISO}
        />
        <CeldaFecha
          valor={tarea.fechaFin}
          onGuardar={guardar("fechaFin")}
          ariaLabel="Fecha de fin"
          mostrar={mostrarFechaISO}
          min={tarea.fechaInicio}
        />

        <CeldaHoras
          valor={tarea.horasEstimadas}
          onGuardar={guardar("horasEstimadas")}
          ariaLabel="Horas estimadas"
        />

        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="ml-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: COLOR_ESTADO[tarea.estado] }}
          />
          <span className="min-w-0 flex-1">
            <CeldaOpciones
              valor={tarea.estado}
              opciones={OPCIONES_ESTADO}
              onGuardar={guardar("estado")}
              ariaLabel="Estado"
              etiqueta={ETIQUETA_ESTADO[tarea.estado]}
            />
          </span>
        </span>

        <span className="flex justify-center">
          <BotonEliminarIcono
            onConfirm={() => eliminarTarea(tarea.id)}
            label="Eliminar tarea"
          />
        </span>
      </div>
    </div>
  );
}
