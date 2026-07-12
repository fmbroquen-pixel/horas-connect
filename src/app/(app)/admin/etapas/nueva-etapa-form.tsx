"use client";

import { useActionState, useRef } from "react";
import { crearEtapa } from "./actions";
import { BTN_PRIMARY } from "@/lib/ui";

export function NuevaEtapaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await crearEtapa(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex flex-wrap gap-2">
      <input
        name="etiqueta"
        placeholder="Etiqueta (ej: Retrospectiva)"
        required
        className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <input
        name="grupo"
        placeholder="Grupo (ej: Cierre / Retrospectiva)"
        required
        className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <button
        type="submit"
        disabled={pending}
        className={BTN_PRIMARY}
      >
        {pending ? "Agregando…" : "Agregar"}
      </button>
      {state?.error && <p className="self-center text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}
