"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { cambiarSemaforo, cambiarEtapa } from "../../proyectos/actions";
import {
  OPCIONES_SEMAFORO,
  ETIQUETA_SEMAFORO,
  COLOR_SEMAFORO,
} from "../../proyectos/constantes";
import { Dropdown, type OpcionDropdown } from "@/components/dropdown";

export type FilaEstado = {
  id: string;
  nombre: string;
  semaforo: string; // "" = sin registrar
  etapaId: string;
  etapaLabel: string;
  mentores: string[];
};

type Columna = "nombre" | "semaforo" | "etapa" | "mentores";

// Insensible a mayúsculas y acentos, mismo criterio que el buscador de
// Proyectos (grid-proyectos.tsx).
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const ORDEN_SEMAFORO: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2, "": 3 };

// Vista condensada y editable del portafolio: buscar, filtrar por semáforo,
// ordenar por columna, y (solo admin) editar semáforo/etapa sin entrar a
// cada proyecto. Mentores queda de solo lectura: se asignan desde
// Settings → Usuarios.
export function TablaEstado({
  filas,
  etapas,
  editable,
}: {
  filas: FilaEstado[];
  etapas: OpcionDropdown[];
  editable: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroSemaforo, setFiltroSemaforo] = useState("");
  const [orden, setOrden] = useState<{ columna: Columna; asc: boolean }>({
    columna: "nombre",
    asc: true,
  });

  const filasVisibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const filtradas = filas.filter(
      (f) =>
        (q === "" || normalizar(f.nombre).includes(q)) &&
        (filtroSemaforo === "" || f.semaforo === filtroSemaforo),
    );
    const signo = orden.asc ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      switch (orden.columna) {
        case "semaforo":
          return signo * (ORDEN_SEMAFORO[a.semaforo] - ORDEN_SEMAFORO[b.semaforo]);
        case "etapa":
          return signo * a.etapaLabel.localeCompare(b.etapaLabel);
        case "mentores":
          return signo * (a.mentores.length - b.mentores.length);
        default:
          return signo * a.nombre.localeCompare(b.nombre);
      }
    });
  }, [filas, busqueda, filtroSemaforo, orden]);

  const toggleOrden = (columna: Columna) =>
    setOrden((o) => (o.columna === columna ? { columna, asc: !o.asc } : { columna, asc: true }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
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
        <Dropdown
          value={filtroSemaforo}
          onChange={setFiltroSemaforo}
          options={[{ value: "", label: "Todos los semáforos" }, ...OPCIONES_SEMAFORO]}
          className="w-48"
          ariaLabel="Filtrar por semáforo"
        />
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-auto dc-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-dc-line">
              <HeaderOrdenable label="Proyecto" columna="nombre" orden={orden} onClick={toggleOrden} align="left" />
              <HeaderOrdenable label="Semáforo" columna="semaforo" orden={orden} onClick={toggleOrden} />
              <HeaderOrdenable label="Etapa actual" columna="etapa" orden={orden} onClick={toggleOrden} />
              <HeaderOrdenable label="Mentores" columna="mentores" orden={orden} onClick={toggleOrden} />
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map((f) => (
              <FilaTabla key={f.id} fila={f} etapas={etapas} editable={editable} />
            ))}
            {filasVisibles.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-dc-muted" colSpan={4}>
                  {filas.length === 0
                    ? "No hay proyectos activos para mostrar."
                    : "No encontramos proyectos con ese filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderOrdenable({
  label,
  columna,
  orden,
  onClick,
  align = "center",
}: {
  label: string;
  columna: Columna;
  orden: { columna: Columna; asc: boolean };
  onClick: (c: Columna) => void;
  align?: "left" | "center";
}) {
  const activa = orden.columna === columna;
  return (
    <th className={`px-4 py-2 ${align === "left" ? "text-left" : "text-center"}`}>
      <button
        type="button"
        onClick={() => onClick(columna)}
        aria-label={`Ordenar por ${label}`}
        className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide outline-none transition focus-visible:ring-2 focus-visible:ring-dc-peri ${
          activa ? "text-dc-text" : "text-dc-muted hover:text-dc-text"
        }`}
      >
        {label}
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${activa && !orden.asc ? "rotate-180" : ""} ${
            activa ? "opacity-100" : "opacity-40"
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </th>
  );
}

function FilaTabla({
  fila,
  etapas,
  editable,
}: {
  fila: FilaEstado;
  etapas: OpcionDropdown[];
  editable: boolean;
}) {
  const [, start] = useTransition();
  const [semaforo, setSemaforo] = useState(fila.semaforo);
  const [etapaId, setEtapaId] = useState(fila.etapaId);

  const elegirSemaforo = (valor: string) => {
    if (valor === semaforo) return;
    setSemaforo(valor);
    start(async () => {
      await cambiarSemaforo(fila.id, valor);
    });
  };

  const elegirEtapa = (valor: string) => {
    if (valor === etapaId) return;
    setEtapaId(valor);
    start(async () => {
      const fd = new FormData();
      fd.append("etapaId", valor);
      await cambiarEtapa(fila.id, undefined, fd);
    });
  };

  return (
    <tr className="border-b border-dc-line last:border-0">
      <td className="px-4 py-3">
        <Link
          href={`/proyectos/${fila.id}`}
          className="text-dc-text transition hover:text-dc-peri"
        >
          {fila.nombre}
        </Link>
      </td>
      <td className="px-4 py-3 text-center">
        {editable ? (
          <Dropdown
            value={semaforo}
            onChange={elegirSemaforo}
            options={OPCIONES_SEMAFORO}
            placeholder="Sin registrar"
            className="mx-auto w-36"
            ariaLabel={`Semáforo de ${fila.nombre}`}
          />
        ) : semaforo ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-dc-text">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_SEMAFORO[semaforo] }}
            />
            {ETIQUETA_SEMAFORO[semaforo]}
          </span>
        ) : (
          <span className="text-xs text-dc-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {editable ? (
          <Dropdown
            value={etapaId}
            onChange={elegirEtapa}
            options={etapas}
            placeholder="Sin registrar"
            className="mx-auto w-44"
            ariaLabel={`Etapa de ${fila.nombre}`}
          />
        ) : fila.etapaLabel ? (
          <span className="text-xs text-dc-text">{fila.etapaLabel}</span>
        ) : (
          <span className="text-xs text-dc-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-xs text-dc-muted">
        {fila.mentores.length > 0 ? fila.mentores.join(", ") : "—"}
      </td>
    </tr>
  );
}
