"use client";

import { useActionState, useState } from "react";
import { crearRegistro, type CampoRegistro } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import type { MapaTarifas, OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink";

const VALORES_INICIALES = {
  fecha: "",
  clienteId: "",
  etapaId: "",
  ownership: "owner",
  modalidad: "presencial",
  horas: "",
};

export function FilaNueva({
  proyectos,
  etapas,
  tarifas,
}: {
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
}) {
  // Todos los campos son controlados para poder, ante un error, conservar lo
  // que está bien y limpiar solo el campo que falló.
  const [valores, setValores] = useState(VALORES_INICIALES);
  const set = (campo: keyof typeof valores, valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }));

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { error?: string; campo?: CampoRegistro } | undefined,
      formData: FormData,
    ) => {
      const result = await crearRegistro(_prev, formData);
      if (!result.error) {
        setValores(VALORES_INICIALES);
      } else if (result.campo) {
        // Limpiar solo el campo con error; el resto queda como estaba.
        set(result.campo, result.campo === "ownership" ? "owner" : result.campo === "modalidad" ? "presencial" : "");
      }
      return result;
    },
    undefined,
  );

  const campoError = state?.campo;
  const cls = (campo: keyof typeof valores) =>
    `${INPUT} ${campoError === campo ? INPUT_ERROR : ""}`;

  const tarifa = tarifas[`${valores.modalidad}-${valores.ownership}`];
  const horasDecimal = parseHorasHsMin(valores.horas);
  const total =
    tarifa !== undefined && horasDecimal !== null && horasDecimal > 0
      ? tarifa * horasDecimal
      : null;

  const reformatearHoras = () => {
    const formateado = reformatEntradaHoras(valores.horas);
    if (formateado) set("horas", formateado);
  };

  return (
    <form action={formAction} className="border-b border-dc-line bg-dc-card px-3 py-2">
      <div className={GRID_TIMETRACKER}>
        <input
          name="fecha"
          type="date"
          required
          max={hoyISO()}
          value={valores.fecha}
          onChange={(e) => set("fecha", e.target.value)}
          className={cls("fecha")}
        />
        <select
          name="clienteId"
          required
          value={valores.clienteId}
          onChange={(e) => set("clienteId", e.target.value)}
          className={cls("clienteId")}
        >
          <option value="" disabled>
            Proyecto
          </option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          name="etapaId"
          required
          value={valores.etapaId}
          onChange={(e) => set("etapaId", e.target.value)}
          className={cls("etapaId")}
        >
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
          value={valores.ownership}
          onChange={(e) => set("ownership", e.target.value)}
          className={cls("ownership")}
        >
          <option value="owner">Owner</option>
          <option value="backup">Backup</option>
        </select>
        <input
          name="horas"
          placeholder="1,5"
          title="Cargá un número (1,5 o 1.5); se muestra como 1:30"
          value={valores.horas}
          onChange={(e) => set("horas", e.target.value)}
          onBlur={reformatearHoras}
          required
          className={cls("horas")}
        />
        <select
          name="modalidad"
          value={valores.modalidad}
          onChange={(e) => set("modalidad", e.target.value)}
          className={cls("modalidad")}
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
        <button type="submit" disabled={pending} className={BTN_PRIMARY_SM}>
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}
