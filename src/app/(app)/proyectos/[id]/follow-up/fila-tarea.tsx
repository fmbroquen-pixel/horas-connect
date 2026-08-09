"use client";

import { useState } from "react";
import { actualizarCampoTarea, actualizarRangoTarea, eliminarTarea } from "./actions";
import {
  GRID_ROADMAP,
  ETIQUETA_ESTADO,
  COLOR_ESTADO,
  OPCIONES_ESTADO,
  type TareaRoadmapFila,
} from "./constantes";
import { mostrarFechaISO } from "../../../admin/clientes/constantes";
import {
  CeldaHoras,
  CeldaOpciones,
  CeldaTexto,
} from "@/components/tabla/celda-editable";
import { RangoFechas } from "@/components/tabla/rango-fechas";
import { BotonEliminarIcono } from "@/components/tabla/acciones-fila";
import { SelectorPersonas } from "./selector-personas";

// Fila del plan con edición inline: cada celda se guarda sola al salir o con
// Enter. Inicio y Fin son la excepción: siguen siendo dos columnas, pero se
// editan desde un único calendario de rango y se guardan de una. Cualquier
// cambio de fechas recalcula, en el servidor, únicamente las tareas
// posteriores.
export function FilaTareaRoadmap({
  tarea,
  seleccionada,
  onToggle,
  agarre,
}: {
  tarea: TareaRoadmapFila;
  seleccionada: boolean;
  onToggle: (id: string) => void;
  // Props de arrastre para la celda del checkbox. Las pone la lista, que es
  // la que conoce el orden completo de sus tareas.
  agarre?: {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}) {
  // El calendario de rango se dibuja en un portal y tapa parte de la tabla:
  // con la fila marcada no se pierde de vista sobre qué tarea se está
  // operando. Solo puede haber una marcada a la vez porque solo puede haber
  // un calendario abierto: abrir otro cierra el anterior.
  const [editandoFechas, setEditandoFechas] = useState(false);

  const guardar = (campo: Parameters<typeof actualizarCampoTarea>[1]) =>
    async (valor: string) => actualizarCampoTarea(tarea.id, campo, valor);

  return (
    // El realce es fondo + una barra lateral por inset shadow. Ninguno de los
    // dos ocupa espacio: la fila no cambia de alto ni empuja a las de abajo
    // al abrir el calendario.
    <div
      className={`border-b border-dc-line px-4 py-2 transition-colors duration-150 last:border-0 ${
        editandoFechas
          ? "bg-dc-peri/[0.07] shadow-[inset_3px_0_0_0_var(--color-dc-peri)]"
          : ""
      }`}
    >
      <div className={GRID_ROADMAP}>
        {/* La celda entera es la zona de agarre: acá no hay nada que editar,
            así que arrastrar desde la izquierda no compite con el nombre, las
            fechas ni los botones de la derecha. El checkbox sigue andando con
            un clic, porque el navegador no emite click si hubo arrastre. */}
        <span
          {...agarre}
          title={agarre ? "Arrastrá para reordenar la tarea" : undefined}
          className={`flex items-center ${agarre ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <input
            type="checkbox"
            checked={seleccionada}
            onChange={() => onToggle(tarea.id)}
            className="h-4 w-4 accent-dc-purple"
            aria-label={`Seleccionar ${tarea.nombre}`}
          />
        </span>

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

        <RangoFechas
          rango={{ inicio: tarea.fechaInicio, fin: tarea.fechaFin }}
          onGuardar={(r) => actualizarRangoTarea(tarea.id, r.inicio, r.fin)}
          mostrar={mostrarFechaISO}
          onAbiertoChange={setEditandoFechas}
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
