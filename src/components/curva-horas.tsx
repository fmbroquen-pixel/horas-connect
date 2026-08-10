"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatHorasHsMin } from "@/lib/horas";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const PERI = "#8b8cff";
const PINK = "#ff91ff";
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

// Horas presupuestadas vs. horas de Time Tracker, ambas acumuladas semana a
// semana. Lo que se lee de un vistazo es la separación entre las dos líneas
// (cuánto se entregó vs. cuánto costó) y la pendiente (si el ritmo se
// sostiene). Ocupa todo el alto que le dé su contenedor.
export function CurvaHoras({
  semanas,
  entregadas,
  reales,
}: {
  semanas: string[]; // etiquetas dd/mm del lunes de cada semana
  entregadas: number[]; // acumulado de horas estimadas de tareas finalizadas
  reales: number[]; // acumulado de horas cargadas en Time Tracking
}) {
  if (semanas.length === 0) {
    return (
      <p className="flex h-full items-center justify-center py-6 text-center text-sm text-dc-muted">
        Todavía no hay tareas finalizadas ni horas cargadas para dibujar la curva.
      </p>
    );
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { color: TICK, usePointStyle: true, pointStyle: "line" },
      },
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => `Semana del ${items[0]?.label ?? ""}`,
          label: (c) => `${c.dataset.label}: ${formatHorasHsMin(Number(c.parsed.y))}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: TICK, maxRotation: 0, autoSkipPadding: 16 },
        grid: { color: GRID },
      },
      y: {
        beginAtZero: true,
        ticks: { color: TICK, callback: (v) => formatHorasHsMin(Number(v)) },
        grid: { color: GRID },
      },
    },
  };

  const data = {
    labels: semanas,
    datasets: [
      {
        label: "Hs Presupuestadas Entregadas",
        data: entregadas,
        borderColor: PERI,
        backgroundColor: "rgba(139,140,255,.15)",
        fill: true,
        tension: 0.25,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: "Hs Time Tracker",
        data: reales,
        borderColor: PINK,
        backgroundColor: "rgba(255,145,255,.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  return (
    // Sin alto propio: lo pone el contenedor, así el mismo gráfico entra
    // tanto en el Home del proyecto como en el de CORE.
    //
    // El canvas se clampea con max-w-full porque Chart.js le escribe el ancho
    // en el style y lo recalcula DESPUÉS de que el layout cambió: entre que la
    // ventana se achica y el gráfico se entera, el canvas conserva el ancho
    // viejo y se sale de su caja. max-width le gana a ese width inline, así
    // que en el peor caso el dibujo queda un instante apretado en vez de
    // empujar la pantalla.
    <div className="h-full min-h-[180px] w-full min-w-0 [&_canvas]:max-w-full">
      <Line options={options} data={data} />
    </div>
  );
}
