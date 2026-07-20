"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ProyectoCard = {
  id: string;
  nombre: string;
  producto: string | null; // etiqueta legible, ya resuelta en el servidor
  mentores: string[];
};

// Búsqueda insensible a mayúsculas y acentos: descompone (NFD) y elimina
// las marcas diacríticas combinantes (\p{M}).
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Selector rápido de espacios de trabajo: buscador + grid de cards
// clickeables. Deliberadamente distinto de las tablas de carga (sin panel
// claro ni columnas): acá solo se elige a qué proyecto entrar.
export function GridProyectos({ proyectos }: { proyectos: ProyectoCard[] }) {
  const [busqueda, setBusqueda] = useState("");

  // El servidor ya entrega orden alfabético; el filtro lo preserva.
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return proyectos;
    return proyectos.filter((p) => normalizar(p.nombre).includes(q));
  }, [busqueda, proyectos]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mt-6 w-full max-w-sm shrink-0">
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dc-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar proyecto…"
          aria-label="Buscar proyecto"
          autoComplete="off"
          className="w-full rounded-lg border border-dc-line bg-dc-deeper py-2 pl-9 pr-3 text-sm text-dc-text outline-none focus:border-dc-peri"
        />
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-2">
        {filtrados.length === 0 ? (
          <p className="py-10 text-center text-sm text-dc-muted">
            {proyectos.length === 0
              ? "Todavía no tenés proyectos asignados."
              : "No encontramos proyectos con ese nombre."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Cards en la paleta violeta de CORE: un tono por encima del
                workspace, con borde definido y sombra sutil para que se
                perciban como "espacios de trabajo" elevados. El nombre es el
                foco; producto y mentores acompañan con menos peso. Toda la
                card es el link; el chevron solo indica acceso. */}
            {filtrados.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                aria-label={`Abrir proyecto ${p.nombre}`}
                className="group flex flex-col rounded-2xl border border-dc-peri/25 bg-[#1c1856] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.35)] outline-none transition hover:-translate-y-0.5 hover:border-dc-peri/50 hover:bg-[#201c60] hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)] focus-visible:ring-2 focus-visible:ring-dc-peri"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base uppercase leading-snug text-white">
                    {p.nombre}
                  </h2>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-dc-muted transition group-hover:translate-x-0.5 group-hover:text-dc-peri"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                <div className="mt-3">
                  {p.producto ? (
                    <span className="inline-block rounded-full bg-dc-peri/10 px-2.5 py-0.5 text-[11px] text-dc-peri/90">
                      {p.producto}
                    </span>
                  ) : (
                    <span className="text-[11px] text-dc-muted/80">Sin producto</span>
                  )}
                </div>

                <p className="mt-2 truncate text-xs text-dc-muted">
                  {p.mentores.length > 0
                    ? p.mentores.join(", ")
                    : "Sin mentores asignados"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
