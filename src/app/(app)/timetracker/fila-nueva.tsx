"use client";

import { useState, useTransition } from "react";
import { crearRegistro, type CampoRegistro } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { GRID_TIMETRACKER } from "./grid";
import { Dropdown } from "@/components/dropdown";
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
        <Dropdown
          name="clienteId"
          value={valores.clienteId}
          onChange={(v) => set("clienteId", v)}
          options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
          placeholder="Proyecto"
          invalido={estado?.campo === "clienteId"}
          ariaLabel="Proyecto"
        />
        <Dropdown
          name="etapaId"
          value={valores.etapaId}
          onChange={(v) => set("etapaId", v)}
          options={etapas.map((e) => ({ value: e.id, label: e.nombre }))}
          placeholder="Etapa"
          invalido={estado?.campo === "etapaId"}
          ariaLabel="Etapa"
        />
        <Dropdown
          name="ownership"
          value={valores.ownership}
          onChange={(v) => set("ownership", v)}
          options={[
            { value: "owner", label: "Owner" },
            { value: "backup", label: "Backup" },
          ]}
          ariaLabel="Ownership"
        />
        <input
          name="horas"
          placeholder="1,5"
          title="Cargá un número (1,5 o 1.5); se muestra como 1:30"
          value={valores.horas}
          onChange={(e) => set("horas", e.target.value)}
          onBlur={reformatearHoras}
          className={cls("horas")}
        />
        <Dropdown
          name="modalidad"
          value={valores.modalidad}
          onChange={(v) => set("modalidad", v)}
          options={[
            { value: "presencial", label: "Presencial" },
            { value: "virtual", label: "Virtual" },
          ]}
          ariaLabel="Modalidad"
        />
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
