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
  return (
    <form action={guardarProyectosAsignados.bind(null, usuarioId)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {clientes.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 rounded-lg border border-dc-line px-3 py-2 text-sm text-dc-text"
          >
            <input
              type="checkbox"
              name="clienteId"
              value={c.id}
              defaultChecked={asignadosIds.has(c.id)}
            />
            {c.nombre}
          </label>
        ))}
      </div>
      <button
        type="submit"
        className={`${BTN_SECONDARY} mt-4`}
      >
        Guardar proyectos asignados
      </button>
    </form>
  );
}
