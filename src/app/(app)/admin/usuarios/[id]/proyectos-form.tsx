"use client";

import { useState } from "react";
import { guardarProyectosAsignados } from "../actions";
import { BTN_SECONDARY } from "@/lib/ui";

type Cliente = { id: string; nombre: string };

export function ProyectosForm({
  usuarioId,
  clientes,
  asignadosIds,
}: {
  usuarioId: string;
  clientes: Cliente[];
  asignadosIds: Set<string>;
}) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(asignadosIds));
  const todos = clientes.length > 0 && seleccion.size === clientes.length;

  const toggle = (id: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleTodos = () =>
    setSeleccion(todos ? new Set() : new Set(clientes.map((c) => c.id)));

  return (
    <form action={guardarProyectosAsignados.bind(null, usuarioId)}>
      <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dc-peri/40 bg-dc-peri/10 px-3 py-2 text-sm text-dc-text">
        <input
          type="checkbox"
          checked={todos}
          onChange={toggleTodos}
          className="h-4 w-4 accent-dc-purple"
        />
        Seleccionar todos
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {clientes.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-dc-line px-3 py-2 text-sm text-dc-text transition hover:border-dc-peri"
          >
            <input
              type="checkbox"
              name="clienteId"
              value={c.id}
              checked={seleccion.has(c.id)}
              onChange={() => toggle(c.id)}
              className="h-4 w-4 accent-dc-purple"
            />
            {c.nombre}
          </label>
        ))}
      </div>
      <button type="submit" className={`${BTN_SECONDARY} mt-4`}>
        Guardar proyectos asignados
      </button>
    </form>
  );
}
