import Link from "next/link";

export type EstadoFiltro = "todos" | "activos" | "inactivos";

// Valida el parámetro de la URL; cualquier valor desconocido cae en "todos".
export function parseEstadoFiltro(valor?: string): EstadoFiltro {
  return valor === "activos" || valor === "inactivos" ? valor : "todos";
}

const OPCIONES: { value: EstadoFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "Inactivos" },
];

// Segmented control de navegación (Link, no cliente): el filtro vive en la
// URL (?estado=...), así que sobrevive a refresh y volver atrás mientras el
// usuario esté en esta tabla. Se usa en Usuarios, Clientes y Etapas.
export function FiltroEstado({
  basePath,
  actual,
}: {
  basePath: string;
  actual: EstadoFiltro;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-dc-line bg-dc-deeper p-1">
      {OPCIONES.map((o) => {
        const activa = o.value === actual;
        const href = o.value === "todos" ? basePath : `${basePath}?estado=${o.value}`;
        return (
          <Link
            key={o.value}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              activa
                ? "bg-dc-peri/20 text-dc-text"
                : "text-dc-muted hover:text-dc-text"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
