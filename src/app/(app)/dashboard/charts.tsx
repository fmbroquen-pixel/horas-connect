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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const GRID = "rgba(139,140,255,.14)";
const TICK = "#a5a3d6";

const tooltip = {
  backgroundColor: "#18154a",
  borderColor: "rgba(255,145,255,.5)",
  borderWidth: 1,
  titleColor: "#ff91ff",
  bodyColor: "#eceafd",
  padding: 10,
  cornerRadius: 8,
} as const;

// Barras verticales: X = etiquetas, Y = horas.
export function BarrasHoras({
  labels,
  horas,
  color,
}: {
  labels: string[];
  horas: number[];
  color: string;
}) {
  if (labels.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-dc-muted">
        No hay horas en el rango seleccionado.
      </div>
    );
  }

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: { label: (c) => `${Number(c.parsed.y).toFixed(2)} hs` },
      },
    },
    scales: {
      x: { ticks: { color: TICK }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `${v} hs`, color: TICK },
        grid: { color: GRID },
      },
    },
  };

  return (
    <div className="h-56">
      <Bar
        data={{
          labels,
          datasets: [{ data: horas, backgroundColor: color, borderRadius: 6, maxBarThickness: 46 }],
        }}
        options={options}
      />
    </div>
  );
}
