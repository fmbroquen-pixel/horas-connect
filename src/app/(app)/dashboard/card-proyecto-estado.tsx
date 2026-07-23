"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cambiarSemaforo, cambiarEtapa } from "../proyectos/actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO } from "../proyectos/constantes";
import { Dropdown, type OpcionDropdown } from "@/components/dropdown";

const LABEL = "text-[10px] uppercase tracking-wide text-dc-muted";

// Card compacta de un proyecto: nombre + semáforo y etapa editables sin
// entrar al proyecto. Mismo estilo que el resto de los widgets del Home.
export function CardProyectoEstado({
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
  etapas: OpcionDropdown[];
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
    <div className="rounded-2xl border border-dc-line bg-dc-card p-4">
      <Link
        href={`/proyectos/${id}`}
        className="block truncate font-display text-sm uppercase text-white transition hover:text-dc-peri"
      >
        {nombre}
      </Link>

      <div className="mt-3">
        <p className={LABEL}>Semáforo</p>
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: semaforo ? COLOR_SEMAFORO[semaforo] : "#4b477a" }}
          />
          <Dropdown
            value={semaforo}
            onChange={elegirSemaforo}
            options={OPCIONES_SEMAFORO}
            placeholder="Sin registrar"
            className="flex-1"
            ariaLabel={`Semáforo de ${nombre}`}
          />
        </div>
      </div>

      <div className="mt-3">
        <p className={LABEL}>Etapa actual</p>
        <Dropdown
          value={etapaId}
          onChange={elegirEtapa}
          options={etapas}
          placeholder="Sin registrar"
          className="mt-1 w-full"
          ariaLabel={`Etapa de ${nombre}`}
        />
      </div>
    </div>
  );
}
