"use client";

import { useActionState, useRef } from "react";

type Accion = (
  prevState: { error?: string } | undefined,
  formData: FormData,
) => Promise<{ error?: string }>;

export function NuevoClienteForm({ action }: { action: Accion }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex gap-2">
      <input
        name="nombre"
        placeholder="Nombre del cliente"
        required
        className="w-full max-w-xs rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-dc-purple px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar"}
      </button>
      {state?.error && <p className="self-center text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}
