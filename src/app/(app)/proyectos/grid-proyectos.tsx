"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ProyectoCard = {
  id: string;
  nombre: string;
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

      {/* pt/px compensan la elevación y la sombra del hover: el contenedor
          tiene overflow para scrollear y sin este aire recortaría el efecto
          en la primera fila y en los bordes. */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-1 pb-3 pt-2">
        {filtrados.length === 0 ? (
          <p className="py-10 text-center text-sm text-dc-muted">
            {proyectos.length === 0
              ? "Todavía no tenés proyectos asignados."
              : "No encontramos proyectos con ese nombre."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Accesos rápidos en la paleta violeta de CORE: un tono por
                encima del workspace, borde definido y sombra para elevarse
                del fondo. Solo ícono + nombre + chevron; toda la card es el
                link. */}
            {filtrados.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                aria-label={`Abrir proyecto ${p.nombre}`}
                className="group flex items-center gap-3 rounded-2xl border border-dc-peri/30 bg-[#1e1a5c] p-4 shadow-[0_6px_18px_rgba(0,0,0,0.4)] outline-none transition hover:-translate-y-0.5 hover:border-dc-peri/55 hover:bg-[#221e66] hover:shadow-[0_10px_24px_rgba(0,0,0,0.5)] focus-visible:ring-2 focus-visible:ring-dc-peri"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dc-peri/10 text-dc-peri"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </span>

                <h2 className="min-w-0 flex-1 truncate font-display text-sm uppercase text-white">
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
                  className="shrink-0 text-dc-muted transition group-hover:translate-x-0.5 group-hover:text-dc-peri"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
