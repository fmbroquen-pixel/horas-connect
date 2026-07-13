"use client";

import { useState, useTransition } from "react";
import { crearRegistro, type CampoRegistro } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import type { MapaTarifas, OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";

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
  // Campos controlados por estado. El submit se maneja manualmente (con
  // preventDefault) para que React no resetee el formulario: ante un error
  // se conserva TODO lo cargado y solo se resalta el campo a corregir.
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoRegistro }>();
  const [pending, start] = useTransition();

  const set = (campo: keyof typeof valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    // Al tocar el campo con error, se quita el resaltado.
    setEstado((e) => (e?.campo === campo ? { error: e.error } : e));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await crearRegistro(undefined, fd);
      if (!r.error) {
        setValores(VALORES_INICIALES);
        setEstado(undefined);
      } else {
        setEstado(r); // conserva `valores` intacto
      }
    });
  };

  const cls = (campo: keyof typeof valores) =>
    `${INPUT} ${estado?.campo === campo ? INPUT_ERROR : ""}`;

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
    <form onSubmit={onSubmit} className="border-b border-dc-line bg-dc-card px-3 py-2">
      <div className={GRID_TIMETRACKER}>
        <span />
        <input
          name="fecha"
          type="date"
          max={hoyISO()}
          value={valores.fecha}
          onChange={(e) => set("fecha", e.target.value)}
          className={cls("fecha")}
        />
        <select
          name="clienteId"
          value={valores.clienteId}
          onChange={(e) => set("clienteId", e.target.value)}
          className={cls("clienteId")}
        >
          <option value="">Proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          name="etapaId"
          value={valores.etapaId}
          onChange={(e) => set("etapaId", e.target.value)}
          className={cls("etapaId")}
        >
          <option value="">Etapa</option>
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
      {estado?.error && <p className="mt-2 text-xs text-dc-pink">{estado.error}</p>}
    </form>
  );
}
