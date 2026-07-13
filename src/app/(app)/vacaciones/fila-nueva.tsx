"use client";

import { useState, useTransition } from "react";
import { crearVacacion } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export const GRID_VACACIONES =
  "grid min-w-[560px] grid-cols-[150px_150px_120px_130px] items-center gap-2";

// Cantidad de días calendario entre dos fechas ISO, ambas inclusive.
function diasEntre(inicioISO: string, finISO: string): number | null {
  if (!inicioISO || !finISO) return null;
  const inicio = new Date(inicioISO + "T00:00:00");
  const fin = new Date(finISO + "T00:00:00");
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return null;
  return Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
}

export function FilaNuevaVacacion() {
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [dias, setDias] = useState("");
  const [diasEditado, setDiasEditado] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await crearVacacion(undefined, fd);
      if (!result.error) {
        setInicio("");
        setFin("");
        setDias("");
        setDiasEditado(false);
        setError(undefined);
      } else {
        setError(result.error);
      }
    });
  };

  const actualizarFechas = (nuevoInicio: string, nuevoFin: string) => {
    setInicio(nuevoInicio);
    setFin(nuevoFin);
    if (!diasEditado) {
      const calculados = diasEntre(nuevoInicio, nuevoFin);
      setDias(calculados !== null ? String(calculados) : "");
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-b border-dc-line bg-dc-card px-3 py-2">
      <div className={GRID_VACACIONES}>
        <input
          name="fechaInicio"
          type="date"
          value={inicio}
          onChange={(e) => actualizarFechas(e.target.value, fin)}
          className={INPUT}
        />
        <input
          name="fechaFin"
          type="date"
          value={fin}
          onChange={(e) => actualizarFechas(inicio, e.target.value)}
          className={INPUT}
        />
        <input
          name="dias"
          type="number"
          min="1"
          step="1"
          placeholder="Días OOO"
          value={dias}
          onChange={(e) => {
            setDias(e.target.value);
            setDiasEditado(true);
          }}
          className={`${INPUT} text-right`}
        />
        <button type="submit" disabled={pending} className={BTN_PRIMARY_SM}>
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-dc-pink">{error}</p>}
    </form>
  );
}
