"use client";

import { useState, useTransition } from "react";
import { cambiarSemaforo } from "../../actions";
import { OPCIONES_SEMAFORO, COLOR_SEMAFORO } from "../../constantes";
import { ToastOk } from "@/components/ui/toast-ok";

export function SemaforoSelector({
  clienteId,
  actual,
}: {
  clienteId: string;
  actual: string;
}) {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<string>();

  const elegir = (estado: string) =>
    start(async () => {
      const r = await cambiarSemaforo(clienteId, estado);
      if (r.error) setError(r.error);
      else {
        setError(undefined);
        setToast(true);
      }
    });

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado del semáforo">
        {OPCIONES_SEMAFORO.map((o) => {
          const activo = o.value === actual;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending}
              onClick={() => elegir(o.value)}
              aria-pressed={activo}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri disabled:opacity-60 ${
                activo
                  ? "border-dc-peri bg-dc-peri/15 text-white"
                  : "border-dc-line text-dc-muted hover:border-dc-peri hover:text-dc-text"
              }`}
            >
              <span
                aria-hidden
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: COLOR_SEMAFORO[o.value],
                  boxShadow: activo ? `0 0 10px ${COLOR_SEMAFORO[o.value]}` : undefined,
                }}
              />
              {o.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-xs text-dc-pink" role="alert">
          {error}
        </p>
      )}

      <ToastOk show={toast} onHide={() => setToast(false)}>
        Semáforo actualizado
      </ToastOk>
    </div>
  );
}
