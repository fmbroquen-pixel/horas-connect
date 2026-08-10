"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

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

// El semáforo es un valor discreto que se sostiene hasta el próximo cambio,
// así que el eje Y va como escala numérica con 1=Rojo, 2=Amarillo, 3=Verde y
// la línea es escalonada: entre dos eventos el estado no "transiciona", se
// mantiene. Una línea recta entre puntos sugeriría estados intermedios que
// no existen.
export const NIVEL_SEMAFORO: Record<string, number> = {
  rojo: 1,
  amarillo: 2,
  verde: 3,
};
const ETIQUETA_NIVEL: Record<number, string> = {
  1: "Rojo",
  2: "Amarillo",
  3: "Verde",
};

export type SerieSemaforo = {
  proyecto: string;
  // Un punto por semana del eje; null antes del primer evento del proyecto.
  niveles: (number | null)[];
};

export function SemaforoEvolucion({
  fechas,
  series,
}: {
  fechas: string[]; // etiquetas dd/mm
  series: SerieSemaforo[];
}) {
  if (series.length === 0) {
    return (
      <p className="flex h-full items-center justify-center py-6 text-center text-sm text-dc-muted">
        Todavía no hay cambios de semáforo registrados en el período elegido.
      </p>
    );
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: {
        labels: { color: TICK, usePointStyle: true, pointStyle: "line", boxWidth: 24 },
      },
      tooltip: {
        ...tooltip,
        callbacks: {
          label: (c) =>
            `${c.dataset.label}: ${ETIQUETA_NIVEL[Number(c.parsed.y)] ?? "—"}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: TICK, maxRotation: 0, autoSkipPadding: 16 }, grid: { color: GRID } },
      y: {
        min: 0.5,
        max: 3.5,
        ticks: {
          stepSize: 1,
          color: TICK,
          callback: (v) => ETIQUETA_NIVEL[Number(v)] ?? "",
        },
        grid: { color: GRID },
      },
    },
  };

  const data = {
    labels: fechas,
    datasets: series.map((s, i) => ({
      label: s.proyecto,
      data: s.niveles,
      borderColor: PALETA[i % PALETA.length],
      backgroundColor: PALETA[i % PALETA.length],
      // Escalonada: el estado se sostiene hasta el próximo cambio.
      stepped: "after" as const,
      spanGaps: false,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2,
    })),
  };

  return (
    // Mismo clampeo del canvas que en curva-horas: Chart.js escribe el ancho
    // inline y lo corrige un tick tarde, así que sin max-w-full el canvas se
    // sale de la card mientras tanto.
    <div className="h-full min-h-[180px] w-full min-w-0 [&_canvas]:max-w-full">
      <Line options={options} data={data} />
    </div>
  );
}
