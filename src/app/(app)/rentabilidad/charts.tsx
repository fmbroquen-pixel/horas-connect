"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { HorasStack } from "@/lib/rentabilidad";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const GRID = "rgba(139,140,255,.14)";
const TICK = "#a5a3d6";
const PALETA = ["#8b8cff", "#ff91ff", "#602eca", "#6f7bff", "#c9a7ff", "#3f7fd6"];

const tooltip = {
  backgroundColor: "#18154a",
  borderColor: "rgba(255,145,255,.5)",
  borderWidth: 1,
  titleColor: "#ff91ff",
  bodyColor: "#eceafd",
  padding: 10,
  cornerRadius: 8,
} as const;

const fmtUsd = (v: number) =>
  (v < 0 ? "-" : "") + "$" + Math.abs(Math.round(v)).toLocaleString("es-AR");

// Cobrado y costo de mentores por cliente, una fila por cliente.
//
// Sin Chart.js, a diferencia del resto de los gráficos de esta pantalla. Acá se
// pide algo que esa librería no da: el porcentaje de margen DENTRO de la fila,
// a la derecha de las barras, y las dos barras sobre el mismo eje en vez de una
// arriba de la otra. Chart.js dibuja en un canvas y su layout no deja meter
// nada en el medio; forzarlo hubiera sido pintar texto en el bitmap, que no se
// selecciona, no escala con el zoom del navegador y no lo lee un lector de
// pantalla.
//
// Con DOM cada fila es lo que dice ser: nombre, barras y pastilla, alineados
// por una grilla. El eje se dibuja abajo con la misma pista, así que las marcas
// caen donde caen las barras.
//
// Las barras van SUPERPUESTAS y no una debajo de la otra: el costo se lee
// contra el cobrado -cuánto de lo que entra se va en mentores- y separarlas
// obligaba a comparar dos longitudes que arrancan en lugares distintos. La de
// costo va más fina y encima, como un termómetro sobre la de cobrado.
export function MargenChart({
  proyectos,
  cobrado,
  costo,
  pct,
}: {
  proyectos: string[];
  cobrado: number[];
  costo: number[];
  pct: (number | null)[];
}) {
  if (proyectos.length === 0) {
    return <SinDatos />;
  }

  // La escala la manda el valor más grande de las dos series, redondeado a una
  // cifra "linda" para que las marcas del eje sean números que se leen.
  const maximo = Math.max(...cobrado, ...costo, 1);
  const tope = escalaLinda(maximo);
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => tope * f);
  const ancho = (v: number) => `${Math.max(0, Math.min(1, v / tope)) * 100}%`;

  return (
    <div>
      {proyectos.map((nombre, i) => {
        const c = cobrado[i] ?? 0;
        const k = costo[i] ?? 0;
        const p = pct[i];
        const detalle = `${nombre} — Cobrado ${fmtUsd(c)} · Costo mentores ${fmtUsd(k)} · Margen ${p === null ? "—" : `${p.toFixed(1)}%`}`;
        return (
          <div
            key={nombre}
            data-tooltip={detalle}
            className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.75rem] items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-dc-peri/[0.06]"
          >
            <span className="truncate text-right text-xs text-dc-muted">{nombre}</span>

            {/* La pista. Las líneas de referencia van acá adentro para que
                coincidan con el eje de abajo, que usa la misma columna. */}
            <span className="relative block h-6">
              <span aria-hidden className="absolute inset-0 flex justify-between">
                {marcas.map((_, m) => (
                  <span key={m} className="w-px bg-dc-peri/10" />
                ))}
              </span>

              {/* Cobrado: la barra de fondo, gruesa. */}
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-3.5 -translate-y-1/2 rounded-r-full bg-dc-peri"
                style={{ width: ancho(c) }}
              />
              {/* Costo: encima y más fina. Se lee cuánto de lo que entra se
                  consume, sin tener que medir dos barras separadas. */}
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-r-full bg-dc-pink"
                style={{ width: ancho(k) }}
              />
            </span>

            {/* En la fila y no en un listado aparte: el porcentaje es de ESTE
                cliente y se lee junto a sus barras. */}
            <span
              className={`justify-self-end rounded-full px-2 py-0.5 text-center text-[11px] font-medium tabular-nums ${
                p === null
                  ? "bg-dc-line/60 text-dc-muted"
                  : p < 0
                    ? "bg-dc-pink/15 text-dc-pink"
                    : "bg-dc-peri/15 text-dc-peri"
              }`}
            >
              {p === null ? "—" : `${p.toFixed(0)}%`}
            </span>
          </div>
        );
      })}

      {/* Eje X. Mismas columnas que las filas, así las marcas caen sobre las
          líneas de referencia. */}
      <div className="mt-1 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.75rem] gap-3">
        <span />
        <span className="flex justify-between border-t border-dc-line pt-1 text-[10px] text-dc-muted">
          {marcas.map((v, m) => (
            <span key={m} className="tabular-nums">
              {fmtUsd(v)}
            </span>
          ))}
        </span>
        <span />
      </div>

      <div className="mt-3 flex items-center justify-end gap-4 text-[11px] text-dc-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-dc-peri" />
          Cobrado
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-dc-pink" />
          Costo mentores
        </span>
      </div>
    </div>
  );
}

// El tope del eje, elegido a partir del PASO y no al revés.
//
// Redondear el máximo directo a 1, 2 o 5 dejaba mucho aire: con un máximo de
// 1.250 el eje se iba a 2.000 y las barras usaban dos tercios del ancho. Acá se
// busca primero un paso "lindo" para las cuatro divisiones —100, 250, 400,
// 500…— y el tope sale de multiplicarlo. Con 1.250 da 1.600, que aprovecha el
// ancho y deja marcas que igual se leen de un vistazo.
const PASOS = [1, 2, 2.5, 4, 5, 10];

function escalaLinda(max: number): number {
  const crudo = max / 4;
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudo)));
  const normalizado = crudo / magnitud;
  const paso = (PASOS.find((p) => normalizado <= p) ?? 10) * magnitud;
  return paso * 4;
}

export function HorasStackChart({ stack }: { stack: HorasStack }) {
  if (stack.proyectos.length === 0 || stack.mentores.length === 0) {
    return <SinDatos />;
  }
  const alto = Math.max(180, stack.proyectos.length * 34 + 40);

  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: TICK, boxWidth: 12 } },
      tooltip: {
        ...tooltip,
        callbacks: {
          label: (c) => `${c.dataset.label}: ${Number(c.parsed.x).toFixed(2)} hs`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { callback: (v) => `${v} hs`, color: TICK },
        grid: { color: GRID },
      },
      y: { stacked: true, ticks: { color: TICK }, grid: { display: false } },
    },
  };

  return (
    <div style={{ height: alto }}>
      <Bar
        data={{
          labels: stack.proyectos,
          datasets: stack.mentores.map((m, i) => ({
            label: m.nombre,
            data: m.horas,
            backgroundColor: PALETA[i % PALETA.length],
            maxBarThickness: 22,
          })),
        }}
        options={options}
      />
    </div>
  );
}

function SinDatos() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-dc-muted">
      No hay datos para el mes seleccionado.
    </div>
  );
}
