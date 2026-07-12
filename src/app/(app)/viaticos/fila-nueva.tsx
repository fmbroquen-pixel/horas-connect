"use client";

import { useActionState, useRef } from "react";
import { crearViatico } from "./actions";
import { hoyISO } from "@/lib/formato";
import { GRID_VIATICOS, type OpcionSelect, ETIQUETA_CONCEPTO } from "./tipos";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri";

export function FilaNuevaViatico({
  proyectos,
  etapas,
}: {
  proyectos: OpcionSelect[];
  etapas: OpcionSelect[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await crearViatico(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-b border-dc-line bg-dc-card px-3 py-2"
    >
      <div className={GRID_VIATICOS}>
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
        <select name="moneda" defaultValue="ARS" className={INPUT}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
        <input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          required
          className={`${INPUT} text-right`}
        />
        <select name="concepto" required defaultValue="" className={INPUT}>
          <option value="" disabled>
            Concepto
          </option>
          {Object.entries(ETIQUETA_CONCEPTO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
        <input
          name="archivo"
          type="file"
          accept="image/*,.pdf"
          className="text-xs text-dc-muted file:mr-1 file:rounded-lg file:border file:border-dc-line file:bg-dc-deeper file:px-2 file:py-1 file:text-xs file:text-dc-muted"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-dc-purple px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}
