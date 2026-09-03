"use client";

import { useState, useTransition } from "react";
import { cambiarSemaforo } from "../actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO } from "../constantes";
import { TagPopover, type OpcionTag } from "@/app/(app)/dashboard/tag-popover";
import { MOTIVO_INACTIVO } from "@/lib/inactivo";

const OPCIONES: OpcionTag[] = OPCIONES_SEMAFORO.map((o) => ({
  ...o,
  dot: COLOR_SEMAFORO[o.value],
}));

// El semáforo del Home del proyecto.
//
// Es el MISMO TagPopover que la lista "Estado de Proyectos" de Home CORE, con
// las mismas opciones y la misma acción de servidor: solo el punto de color, un
// clic para abrirlo, y el proyecto inactivo lo deja de solo lectura. No hay una
// segunda implementación del semáforo; lo único propio de acá es que vive en
// una card de KPI en vez de en una fila de tabla.
//
// Antes vivía en Follow Up como tres botones con etiqueta. Ese bloque se fue:
// el semáforo es un indicador de estado del proyecto, y su lugar es el tablero
// de control, no la pantalla del plan de trabajo.
export function SemaforoKpi({
  clienteId,
  nombre,
  semaforo: inicial,
  ultimoCambio,
  activo,
}: {
  clienteId: string;
  nombre: string;
  semaforo: string;
  // "Último cambio: Verde · 31/08/2026", o vacío si nunca se registró. Es el
  // historial que ya mostraba Follow Up y que se conserva en el tooltip.
  ultimoCambio: string;
  activo: boolean;
}) {
  const [semaforo, setSemaforo] = useState(inicial);
  const [, start] = useTransition();

  const elegir = (valor: string) => {
    if (valor === semaforo) return;
    // Optimista: el punto cambia en el acto y el servidor confirma. Es un solo
    // evento sin reglas cruzadas —a diferencia de la etapa, que puede
    // rechazarse— así que adelantarlo no puede dejar a la vista algo inválido.
    setSemaforo(valor);
    start(async () => {
      await cambiarSemaforo(clienteId, valor);
    });
  };

  return (
    <TagPopover
      valor={semaforo}
      opciones={OPCIONES}
      placeholder="Sin registrar"
      onElegir={elegir}
      ariaLabel={`Semáforo de ${nombre}`}
      anchoMenu="w-44"
      soloPunto
      soloLectura={!activo}
      motivoSoloLectura={MOTIVO_INACTIVO}
      tooltip={ultimoCambio || undefined}
    />
  );
}
