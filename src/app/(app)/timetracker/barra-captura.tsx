"use client";

import { useRef, useState, useTransition } from "react";
import { crearRegistro, type CampoRegistro } from "./actions";
import { BTN_PRIMARY } from "@/lib/ui";
import { parseHorasHsMin, reformatEntradaHoras } from "@/lib/horas";
import { formatMonto, hoyISO } from "@/lib/formato";
import { Dropdown } from "@/components/dropdown";
import type { MapaTarifas, OpcionSelect } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";
const LABEL = "mb-1 block text-[11px] uppercase tracking-wide text-dc-muted";

const VALORES_INICIALES = {
  fecha: "",
  clienteId: "",
  etapaId: "",
  ownership: "owner",
  modalidad: "presencial",
  horas: "",
};

// Barra de captura permanente (no es la primera fila de la tabla): componente
// independiente, optimizado para cargar varias horas seguidas con el mínimo de
// clics. Al guardar conserva los campos que no suelen cambiar (fecha, proyecto,
// ownership, modalidad), limpia Etapa y Horas y devuelve el foco a Etapa.
export function BarraCaptura({
  proyectos,
  etapas,
  tarifas,
}: {
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
  tarifas: MapaTarifas;
}) {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoRegistro }>();
  const [pending, start] = useTransition();
  const etapaRef = useRef<HTMLDivElement>(null);

  const set = (campo: keyof typeof valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setEstado((e) => (e?.campo === campo ? { error: e.error } : e));
  };

  const enfocarEtapa = () => etapaRef.current?.querySelector("button")?.focus();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await crearRegistro(undefined, fd);
      if (!r.error) {
        // Conserva fecha/proyecto/ownership/modalidad; limpia lo que cambia.
        setValores((v) => ({ ...v, etapaId: "", horas: "" }));
        setEstado(undefined);
        setTimeout(enfocarEtapa, 20);
      } else {
        setEstado(r);
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
    <form
      onSubmit={onSubmit}
      className="shrink-0 rounded-xl border border-dc-peri/25 bg-dc-card p-3"
      aria-label="Barra de captura de horas"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="block w-36">
          <span className={LABEL}>Fecha</span>
          <input
            name="fecha"
            type="date"
            max={hoyISO()}
            value={valores.fecha}
            onChange={(e) => set("fecha", e.target.value)}
            className={cls("fecha")}
          />
        </label>

        <div className="w-44">
          <span className={LABEL}>Proyecto</span>
          <Dropdown
            name="clienteId"
            value={valores.clienteId}
            onChange={(v) => set("clienteId", v)}
            options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
            placeholder="Proyecto"
            invalido={estado?.campo === "clienteId"}
            className="w-full"
            ariaLabel="Proyecto"
          />
        </div>

        <div className="w-44" ref={etapaRef}>
          <span className={LABEL}>Etapa</span>
          <Dropdown
            name="etapaId"
            value={valores.etapaId}
            onChange={(v) => set("etapaId", v)}
            options={etapas.map((e) => ({ value: e.id, label: e.nombre }))}
            placeholder="Etapa"
            invalido={estado?.campo === "etapaId"}
            className="w-full"
            ariaLabel="Etapa"
          />
        </div>

        <div className="w-32">
          <span className={LABEL}>Ownership</span>
          <Dropdown
            name="ownership"
            value={valores.ownership}
            onChange={(v) => set("ownership", v)}
            options={[
              { value: "owner", label: "Owner" },
              { value: "backup", label: "Backup" },
            ]}
            className="w-full"
            ariaLabel="Ownership"
          />
        </div>

        <label className="block w-24">
          <span className={LABEL}>Horas</span>
          <input
            name="horas"
            placeholder="1,5"
            title="Cargá un número (1,5 o 1.5); se muestra como 1:30"
            value={valores.horas}
            onChange={(e) => set("horas", e.target.value)}
            onBlur={reformatearHoras}
            className={cls("horas")}
          />
        </label>

        <div className="w-32">
          <span className={LABEL}>Modalidad</span>
          <Dropdown
            name="modalidad"
            value={valores.modalidad}
            onChange={(v) => set("modalidad", v)}
            options={[
              { value: "presencial", label: "Presencial" },
              { value: "virtual", label: "Virtual" },
            ]}
            className="w-full"
            ariaLabel="Modalidad"
          />
        </div>

        <div className="w-24">
          <span className={LABEL}>USD total</span>
          <span className="block truncate px-1 py-1.5 text-right text-sm tabular-nums text-dc-text">
            {total !== null ? formatMonto(total) : "—"}
          </span>
        </div>

        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Guardando…" : "+ Nuevo registro"}
        </button>
      </div>

      {estado?.error && (
        <p className="mt-2 text-xs text-dc-pink" role="alert">{estado.error}</p>
      )}
    </form>
  );
}
