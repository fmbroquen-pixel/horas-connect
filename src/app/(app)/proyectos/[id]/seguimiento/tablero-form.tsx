"use client";

import { useActionState, useState } from "react";
import { guardarTablero } from "../../actions";
import { ToastOk } from "@/components/ui/toast-ok";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui";

const INPUT =
  "w-full rounded-lg border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri";

export function TableroForm({
  clienteId,
  tableroUrl,
}: {
  clienteId: string;
  tableroUrl: string;
}) {
  const [url, setUrl] = useState(tableroUrl);
  const [toast, setToast] = useState(false);

  const accion = guardarTablero.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      const r = await accion(prev, formData);
      if (!r.error) setToast(true);
      return r;
    },
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs text-dc-muted">Enlace del tablero</span>
        <input
          name="tableroUrl"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          autoComplete="off"
          className={INPUT}
        />
      </label>

      {state?.error && (
        <p className="text-xs text-dc-pink" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Guardando…" : "Guardar enlace"}
        </button>
        {tableroUrl && (
          <a
            href={tableroUrl}
            target="_blank"
            rel="noreferrer"
            className={BTN_SECONDARY}
          >
            Abrir tablero ↗
          </a>
        )}
      </div>

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Enlace guardado
      </ToastOk>
    </form>
  );
}
