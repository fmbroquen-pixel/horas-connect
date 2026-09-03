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

const PERI = "#8b8cff";
const PINK = "#ff91ff";
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

// Cobrado y costo de mentores, uno al lado del otro por cliente.
//
// Agrupadas y no apiladas: apilar suma, y acá no hay nada que sumar -el costo
// no se le agrega al cobrado, se le resta-. Una al lado de la otra la
// comparación se lee sola: la distancia entre las dos barras ES el margen.
//
// Antes el gráfico mostraba una sola barra con el margen ya calculado y el
// detalle vivía en una tabla debajo. Eso obligaba a mirar dos lugares para
// entender un número que sale de dos: cuánto entra y cuánto cuesta.
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
  // Dos barras por cliente más el aire entre grupos.
  const alto = Math.max(200, proyectos.length * 52 + 48);

  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: TICK,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        ...tooltip,
        callbacks: {
          // Las dos barras y el margen en el mismo globo: son la misma
          // pregunta, y separarlas obligaba a pasar por encima dos veces.
          afterBody: (items) => {
            const i = items[0]?.dataIndex ?? 0;
            const p = pct[i];
            const margen = (cobrado[i] ?? 0) - (costo[i] ?? 0);
            return [
              `Margen: ${fmtUsd(margen)}`,
              `Margen %: ${p === null ? "—" : `${p.toFixed(1)}%`}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { callback: (v) => fmtUsd(Number(v)), color: TICK },
        grid: { color: GRID },
      },
      y: { ticks: { color: TICK }, grid: { display: false } },
    },
  };

  return (
    <div style={{ height: alto }}>
      <Bar
        options={options}
        data={{
          labels: proyectos,
          datasets: [
            {
              label: "Cobrado",
              data: cobrado,
              backgroundColor: PERI,
              // Redondeado solo en la punta que crece: redondear el arranque
              // despega la barra del eje y deja de leerse desde dónde mide.
              borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 6, bottomRight: 6 },
              borderSkipped: false,
              barPercentage: 0.82,
              categoryPercentage: 0.72,
            },
            {
              label: "Costo mentores",
              data: costo,
              backgroundColor: PINK,
              borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 6, bottomRight: 6 },
              borderSkipped: false,
              barPercentage: 0.82,
              categoryPercentage: 0.72,
            },
          ],
        }}
      />
    </div>
  );
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
