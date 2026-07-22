"use client";

import { useActionState, useState } from "react";
import { cambiarEtapa } from "../../actions";
import { Dropdown, type OpcionDropdown } from "@/components/dropdown";
import { ToastOk } from "@/components/ui/toast-ok";
import { BTN_PRIMARY } from "@/lib/ui";

export function EtapaForm({
  clienteId,
  etapas,
  actualId,
}: {
  clienteId: string;
  etapas: OpcionDropdown[];
  actualId: string;
}) {
  const [etapaId, setEtapaId] = useState(actualId);
  const [toast, setToast] = useState(false);

  const accion = cambiarEtapa.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
      if (!r.error) setToast(true);
      return r;
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56">
        <span className="mb-1 block text-xs text-dc-muted">Etapa</span>
        <Dropdown
          name="etapaId"
          value={etapaId}
          onChange={setEtapaId}
          options={etapas}
          placeholder="Elegí una etapa"
          className="w-full"
          ariaLabel="Etapa"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !etapaId || etapaId === actualId}
        className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {pending ? "Guardando…" : "Actualizar etapa"}
      </button>

      {state?.error && (
        <p className="w-full text-xs text-dc-pink" role="alert">
          {state.error}
        </p>
      )}

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Etapa actualizada
      </ToastOk>
    </form>
  );
}
