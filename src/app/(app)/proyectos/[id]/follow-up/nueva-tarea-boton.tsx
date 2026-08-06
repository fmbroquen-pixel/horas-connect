"use client";

import { useRef, useState, useTransition } from "react";
import { crearTarea } from "./actions";

// Alta de tarea al pie de la lista, sin modal: para un nombre no hace falta.
// La tarea nace con un día hábil de duración, sin horas y sin iniciar; sus
// fechas las asigna la secuencia a partir de la tarea anterior. Todo lo demás
// se ajusta después en la misma fila.
export function NuevaTareaBoton({ listaId }: { listaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelado = useRef(false);

  const crear = (valor: string) => {
    const nombre = valor.trim();
    if (!nombre) {
      setAbierto(false);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("nombre", nombre);
      const r = await crearTarea(listaId, undefined, fd);
      if (r.error) {
        setError(r.error);
        return;
      }
      setError(undefined);
      // Queda listo para encadenar varias altas seguidas.
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    });
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-dc-muted transition hover:bg-dc-card hover:text-dc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dc-peri/40"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar tarea
      </button>
    );
  }

  return (
    <div className="px-4 py-2">
      <input
        ref={inputRef}
        autoFocus
        disabled={pending}
        placeholder="Nombre de la tarea y Enter"
        aria-label="Nombre de la tarea nueva"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            crear(e.currentTarget.value);
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelado.current = true;
            setAbierto(false);
            setError(undefined);
          }
        }}
        onBlur={(e) => {
          if (cancelado.current) {
            cancelado.current = false;
            return;
          }
          const v = e.target.value.trim();
          if (v) crear(v);
          else setAbierto(false);
        }}
        className="w-full max-w-sm rounded-lg border border-dc-line bg-dc-deeper px-2 py-1.5 text-sm text-dc-text outline-none focus:border-dc-peri disabled:opacity-50"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-dc-pink">
          {error}
        </p>
      )}
    </div>
  );
}
