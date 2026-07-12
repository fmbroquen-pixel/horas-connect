"use client";

import { useState, useTransition } from "react";
import { guardarFacturacion } from "./actions";

// Input inline para que el admin cargue/edite la facturación de un proyecto
// en el mes seleccionado. Guarda al salir del campo si el valor cambió.
export function FacturacionInput({
  clienteId,
  anio,
  mes,
  valor,
}: {
  clienteId: string;
  anio: number;
  mes: number;
  valor: number;
}) {
  const [v, setV] = useState(String(valor || ""));
  const [pending, start] = useTransition();

  const guardar = () => {
    const nuevo = Number(v || 0);
    if (nuevo === Number(valor || 0)) return;
    const fd = new FormData();
    fd.set("clienteId", clienteId);
    fd.set("anio", String(anio));
    fd.set("mes", String(mes));
    fd.set("montoUsd", String(nuevo));
    start(() => {
      guardarFacturacion(undefined, fd);
    });
  };

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={v}
      placeholder="0"
      onChange={(e) => setV(e.target.value)}
      onBlur={guardar}
      disabled={pending}
      className="w-28 rounded-lg border border-dc-line bg-dc-deeper px-2 py-1 text-right text-sm text-dc-text outline-none focus:border-dc-peri disabled:opacity-60"
    />
  );
}
