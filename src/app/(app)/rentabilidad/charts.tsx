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
const MUTED = "#413d80";
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

export function MargenChart({
  proyectos,
  margenes,
  pct,
}: {
  proyectos: string[];
  margenes: number[];
  pct: (number | null)[];
}) {
  if (proyectos.length === 0) {
    return <SinDatos />;
  }
  const colores = margenes.map((v) => (v > 0 ? PERI : v < 0 ? PINK : MUTED));
  const alto = Math.max(180, proyectos.length * 34 + 40);

  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: {
          label: (c) => {
            const p = pct[c.dataIndex];
            const pctTxt = p === null ? "sin facturación" : `${p.toFixed(1)}%`;
            return `${fmtUsd(Number(c.parsed.x))} — ${pctTxt}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { callback: (v) => fmtUsd(Number(v)), color: TICK }, grid: { color: GRID } },
      y: { ticks: { color: TICK }, grid: { display: false } },
    },
  };

  return (
    <div style={{ height: alto }}>
      <Bar
        data={{
          labels: proyectos,
          datasets: [
            { data: margenes, backgroundColor: colores, borderRadius: 4, maxBarThickness: 22 },
          ],
        }}
        options={options}
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
