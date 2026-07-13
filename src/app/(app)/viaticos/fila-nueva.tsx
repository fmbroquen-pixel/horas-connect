"use client";

import { useRef, useState, useTransition } from "react";
import { crearViatico, type CampoViatico } from "./actions";
import { BTN_PRIMARY_SM } from "@/lib/ui";
import { hoyISO } from "@/lib/formato";
import { GRID_VIATICOS, type OpcionSelect, ETIQUETA_CONCEPTO } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";
const INPUT_ERROR = "border-dc-pink ring-1 ring-dc-pink";

const INICIAL = {
  fecha: "",
  clienteId: "",
  etapaId: "",
  moneda: "ARS",
  monto: "",
  concepto: "",
};

export function FilaNuevaViatico({
  proyectos,
  etapas,
}: {
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
}) {
  const [valores, setValores] = useState(INICIAL);
  const [estado, setEstado] = useState<{ error?: string; campo?: CampoViatico }>();
  const [pending, start] = useTransition();
  const archivoRef = useRef<HTMLInputElement>(null);

  const set = (campo: keyof typeof valores, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setEstado((e) => (e?.campo === campo ? { error: e.error } : e));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await crearViatico(undefined, fd);
      if (!r.error) {
        setValores(INICIAL);
        setEstado(undefined);
        if (archivoRef.current) archivoRef.current.value = "";
      } else {
        setEstado(r);
      }
    });
  };

  const cls = (campo: keyof typeof valores) =>
    `${INPUT} ${estado?.campo === campo ? INPUT_ERROR : ""}`;

  return (
    <form onSubmit={onSubmit} className="border-b border-dc-line bg-dc-card px-3 py-2">
      <div className={GRID_VIATICOS}>
        <input
          name="fecha"
          type="date"
          max={hoyISO()}
          value={valores.fecha}
          onChange={(e) => set("fecha", e.target.value)}
          className={cls("fecha")}
        />
        <select name="clienteId" value={valores.clienteId} onChange={(e) => set("clienteId", e.target.value)} className={cls("clienteId")}>
          <option value="">Proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <select name="etapaId" value={valores.etapaId} onChange={(e) => set("etapaId", e.target.value)} className={cls("etapaId")}>
          <option value="">Etapa</option>
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <select name="moneda" value={valores.moneda} onChange={(e) => set("moneda", e.target.value)} className={cls("moneda")}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
        <input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          value={valores.monto}
          onChange={(e) => set("monto", e.target.value)}
          className={`${cls("monto")} text-right`}
        />
        <select name="concepto" value={valores.concepto} onChange={(e) => set("concepto", e.target.value)} className={cls("concepto")}>
          <option value="">Concepto</option>
          {Object.entries(ETIQUETA_CONCEPTO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>{etiqueta}</option>
          ))}
        </select>
        <input
          ref={archivoRef}
          name="archivo"
          type="file"
          accept="image/*,.pdf"
          className="text-xs text-dc-muted file:mr-1 file:rounded-lg file:border file:border-dc-line file:bg-dc-deeper file:px-2 file:py-1 file:text-xs file:text-dc-muted"
        />
        <button type="submit" disabled={pending} className={BTN_PRIMARY_SM}>
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </div>
      {estado?.error && <p className="mt-2 text-xs text-dc-pink">{estado.error}</p>}
    </form>
  );
}
