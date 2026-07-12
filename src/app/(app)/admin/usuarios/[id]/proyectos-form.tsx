import { guardarProyectosAsignados } from "../actions";

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
      <p className="text-xs text-dc-muted">
        Si no marcás ningún proyecto, el mentor puede cargar horas en
        cualquier cliente activo. En cuanto marqués al menos uno, el
        formulario de carga se limita a los que elijas acá.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        className="mt-4 rounded-xl border border-dc-line px-4 py-2 text-sm text-dc-muted transition hover:text-dc-text"
      >
        Guardar proyectos asignados
      </button>
    </form>
  );
}
