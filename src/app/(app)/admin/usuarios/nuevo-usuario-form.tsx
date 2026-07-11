"use client";

import { useActionState, useRef } from "react";
import { crearUsuario } from "./actions";

type Mentor = { id: string; nombre: string };

export function NuevoUsuarioForm({ mentores }: { mentores: Mentor[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const result = await crearUsuario(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex flex-wrap gap-2">
      <input
        name="nombre"
        placeholder="Nombre"
        required
        className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <input
        name="email"
        type="email"
        placeholder="email@embarca.tech"
        required
        className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <select
        name="rol"
        defaultValue="guest"
        className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      >
        <option value="guest">Mentor (guest)</option>
        <option value="admin">Administrador</option>
      </select>
      <select
        name="mentorId"
        defaultValue=""
        className="rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      >
        <option value="">Sin vincular a mentor</option>
        {mentores.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-dc-purple px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar usuario"}
      </button>
      {state?.error && <p className="w-full text-xs text-dc-pink">{state.error}</p>}
    </form>
  );
}
