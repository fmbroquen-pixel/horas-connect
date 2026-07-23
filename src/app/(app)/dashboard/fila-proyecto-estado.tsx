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

// Anchos de columna compartidos con el header (estado-proyectos.tsx), para
// que ambos queden perfectamente alineados sin usar <table> ni CSS grid.
export const COL_SEMAFORO_W = "w-28";
export const COL_ETAPA_W = "w-40";

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
      {/* El proyecto se ve y se comporta como un acceso: fondo al hover,
          color de acento y chevron que aparece y se desliza. */}
      <Link
        href={`/proyectos/${id}`}
        className="group flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-dc-text transition hover:bg-dc-peri/10 hover:text-dc-peri"
      >
        <span className="truncate">{nombre}</span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-dc-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:text-dc-peri group-hover:opacity-100"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>
      <div className={`${COL_SEMAFORO_W} shrink-0`}>
        <TagPopover
          valor={semaforo}
          opciones={OPCIONES_SEMAFORO_TAG}
          placeholder="Sin registrar"
          onElegir={elegirSemaforo}
          ariaLabel={`Semáforo de ${nombre}`}
          anchoMenu="w-44"
        />
      </div>
      <div className={`${COL_ETAPA_W} shrink-0`}>
        <TagPopover
          valor={etapaId}
          opciones={etapas}
          placeholder="Sin etapa"
          onElegir={elegirEtapa}
          ariaLabel={`Etapa de ${nombre}`}
          anchoMenu="w-56"
        />
      </div>
    </div>
  );
}
