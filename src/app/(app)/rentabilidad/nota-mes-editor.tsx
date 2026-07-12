"use client";

import { useActionState } from "react";
import { guardarNotaMes } from "./actions";
import { BTN_PRIMARY } from "@/lib/ui";

export function NotaMesEditor({
  anio,
  mes,
  texto,
}: {
  anio: number;
  mes: number;
  texto: string;
}) {
  const accion = guardarNotaMes.bind(null, anio, mes);
  const [state, formAction, pending] = useActionState(accion, undefined);

  return (
    <form action={formAction}>
      <textarea
        name="texto"
        defaultValue={texto}
        rows={4}
        placeholder="Observaciones cualitativas del mes (concentración, cuentas a revisar, eficiencia, etc.)."
        className="w-full rounded-xl border border-dc-line bg-dc-deeper px-3 py-2 text-sm text-dc-text outline-none focus:border-dc-peri"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Guardando…" : "Guardar notas"}
        </button>
        {state?.ok && <span className="text-xs text-dc-peri">Guardado.</span>}
      </div>
    </form>
  );
}
