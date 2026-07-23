"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cambiarSemaforo, cambiarEtapa } from "../proyectos/actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO } from "../proyectos/constantes";
import { TagPopover, type OpcionTag } from "./tag-popover";

const OPCIONES_SEMAFORO_TAG: OpcionTag[] = OPCIONES_SEMAFORO.map((o) => ({
  ...o,
  dot: COLOR_SEMAFORO[o.value],
}));

// Fila de la lista ejecutiva "Estado de Proyectos": Proyecto · Semáforo ·
// Etapa, alineados por columna con flex (sin table ni grid). Semáforo y
// Etapa son tags que abren un popover propio (TagPopover) al tocarlos.
export function FilaProyectoEstado({
  id,
  nombre,
  semaforo: semaforoInicial,
  etapaId: etapaIdInicial,
  etapas,
}: {
  id: string;
  nombre: string;
  semaforo: string;
  etapaId: string;
  etapas: OpcionTag[];
}) {
  const [, start] = useTransition();
  const [semaforo, setSemaforo] = useState(semaforoInicial);
  const [etapaId, setEtapaId] = useState(etapaIdInicial);

  const elegirSemaforo = (valor: string) => {
    if (valor === semaforo) return;
    setSemaforo(valor);
    start(async () => {
      await cambiarSemaforo(id, valor);
    });
  };

  const elegirEtapa = (valor: string) => {
    if (valor === etapaId) return;
    setEtapaId(valor);
    start(async () => {
      const fd = new FormData();
      fd.append("etapaId", valor);
      await cambiarEtapa(id, undefined, fd);
    });
  };

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link
        href={`/proyectos/${id}`}
        className="min-w-0 flex-1 truncate text-sm text-dc-text transition hover:text-dc-peri"
      >
        {nombre}
      </Link>
      <div className="w-28 shrink-0">
        <TagPopover
          valor={semaforo}
          opciones={OPCIONES_SEMAFORO_TAG}
          placeholder="Sin registrar"
          onElegir={elegirSemaforo}
          ariaLabel={`Semáforo de ${nombre}`}
        />
      </div>
      <div className="w-40 shrink-0">
        <TagPopover
          valor={etapaId}
          opciones={etapas}
          placeholder="Sin etapa"
          onElegir={elegirEtapa}
          ariaLabel={`Etapa de ${nombre}`}
        />
      </div>
    </div>
  );
}
