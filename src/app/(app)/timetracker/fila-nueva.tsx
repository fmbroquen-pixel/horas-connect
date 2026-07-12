"use client";

import { useActionState, useRef, useState } from "react";
import { crearRegistro } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";
import { parseHorasHsMin } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import type { MapaTarifas, OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaNueva({
  proyectos,
  etapas,
  tarifas,
}: {
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [modalidad, setModalidad] = useState("presencial");
  const [ownership, setOwnership] = useState("owner");
  const [horas, setHoras] = useState("");

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await crearRegistro(prev, formData);
      if (!result.error) {
        formRef.current?.reset();
        setHoras("");
      }
      return result;
    },
    undefined,
  );

  const tarifa = tarifas[`${modalidad}-${ownership}`];
  const horasDecimal = parseHorasHsMin(horas);
  const total =
    tarifa !== undefined && horasDecimal !== null && horasDecimal > 0
      ? tarifa * horasDecimal
      : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-3 py-2"
    >
      <div className={GRID_TIMETRACKER}>
        <input name="fecha" type="date" required max={hoyISO()} className={INPUT} />
        <select name="clienteId" required defaultValue="" className={INPUT}>
          <option value="" disabled>
            Proyecto
          </option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select name="etapaId" required defaultValue="" className={INPUT}>
          <option value="" disabled>
            Etapa
          </option>
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select
          name="ownership"
          value={ownership}
          onChange={(e) => setOwnership(e.target.value)}
          className={INPUT}
        >
          <option value="owner">Owner</option>
          <option value="backup">Backup</option>
        </select>
        <input
          name="horas"
          placeholder="1:30"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          required
          className={INPUT}
        />
        <select
          name="modalidad"
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          className={INPUT}
        >
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
        <span className="text-right text-sm tabular-nums text-dc-muted">
          {tarifa !== undefined ? formatMonto(tarifa) : "—"}
        </span>
        <span className="text-right text-sm tabular-nums text-dc-text">
          {total !== null ? formatMonto(total) : "—"}
        </span>
        <button
          type="submit"
          disabled={pending}
          className={BTN_PRIMARY_SM}
        >
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </div>
      {state?.error && (
        <p className="mt-2 text-xs text-dc-pink">{state.error}</p>
      )}
    </form>
  );
}
