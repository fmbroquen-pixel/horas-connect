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

// Fila de la lista ejecutiva "Estado de Proyectos": tres columnas
// equivalentes (1/3 cada una: min-w-0 flex-1, igual que el header en
// estado-proyectos.tsx), con el contenido centrado dentro de cada una.
// Semáforo y Etapa son tags que abren un popover propio (TagPopover).
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
      {/* Columna 1/3: el proyecto se ve y se comporta como un acceso (fondo
          al hover, acento y chevron), pero como inline-flex centrado no
          ocupa más ancho que su contenido. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <Link
          href={`/proyectos/${id}`}
          className="group inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-dc-text transition hover:bg-dc-peri/10 hover:text-dc-peri"
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
      </div>
      {/* Columna 2/3: semáforo centrado con ancho de tag acotado. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="w-full max-w-[10rem]">
          <TagPopover
            valor={semaforo}
            opciones={OPCIONES_SEMAFORO_TAG}
            placeholder="Sin registrar"
            onElegir={elegirSemaforo}
            ariaLabel={`Semáforo de ${nombre}`}
            anchoMenu="w-44"
          />
        </div>
      </div>
      {/* Columna 3/3: etapa centrada con ancho de tag acotado. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="w-full max-w-[13rem]">
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
    </div>
  );
}
