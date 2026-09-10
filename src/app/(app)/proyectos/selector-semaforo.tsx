"use client";

import { useState, useTransition } from "react";
import { cambiarSemaforo } from "./actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO } from "./constantes";
import { TagPopover, type OpcionTag } from "@/app/(app)/dashboard/tag-popover";
import { MOTIVO_INACTIVO } from "@/lib/inactivo";

const OPCIONES: OpcionTag[] = OPCIONES_SEMAFORO.map((o) => ({
  ...o,
  dot: COLOR_SEMAFORO[o.value],
}));

// EL selector de semáforo de CORE. Lo usan Home CORE -una fila por proyecto en
// "Estado de Proyectos"- y el Home del proyecto -su propia card de KPI-, y es
// el mismo en los dos: mismas opciones, misma acción de servidor, mismo modo de
// solo lectura. Antes cada pantalla armaba su TagPopover con su copia de las
// opciones y del guardado optimista; dos copias de una regla terminan siendo
// dos reglas.
//
// Lo único que cambia entre contextos entra por props: el tamaño -en una card
// es el único contenido, en una fila convive con veinte más- y el tooltip con
// el historial, que el Home del proyecto tiene y la lista no.
export function SelectorSemaforo({
  clienteId,
  nombre,
  semaforo: inicial,
  activo,
  tamano = "fila",
  ultimoCambio,
}: {
  clienteId: string;
  nombre: string;
  semaforo: string;
  // Un proyecto inactivo se sigue viendo, pero no se toca: cambiarle el
  // semáforo escribiría un evento nuevo sobre un cliente que dejó de operar.
  activo: boolean;
  tamano?: "fila" | "card";
  // "Último cambio: Verde · 31/08/2026". Sin esto el tooltip dice el color,
  // que es lo único que falta cuando se ve solo el punto.
  ultimoCambio?: string;
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
      puntoGrande={tamano === "card"}
      soloLectura={!activo}
      motivoSoloLectura={MOTIVO_INACTIVO}
      tooltip={ultimoCambio}
    />
  );
}
