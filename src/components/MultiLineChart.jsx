import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function cssRgb(varName) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return `rgb(${v})`;
}
function cssRgba(varName, a) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return `rgba(${v} / ${a})`;
}

export default function MultiLineChart({ title, labels, series, unit = "" }) {
  const colors = useMemo(() => ({
    text: cssRgb("--chart-text"),
    grid: cssRgba("--chart-grid", 0.35),
    c1: cssRgb("--chart-line-1"),
    c2: cssRgb("--chart-line-2"),
    c3: cssRgb("--chart-line-3"),
  }), [document.documentElement.classList.contains("dark")]); // eslint-disable-line

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const palette = [colors.c1, colors.c2, colors.c3];

  const data = useMemo(() => ({
    labels,
    datasets: (series || []).map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: palette[i % palette.length],
      backgroundColor: "transparent",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.25,
    })),
  }), [labels, series, palette]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: { color: colors.text, boxWidth: 10, boxHeight: 10 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${unit}`,
        },
      },
    },
    scales: {
      x: { grid: { color: colors.grid }, ticks: { color: colors.text, maxTicksLimit: 6 } },
      y: { grid: { color: colors.grid }, ticks: { color: colors.text, maxTicksLimit: 5 } },
    },
  }), [colors, unit]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{unit ? `unit: ${unit}` : ""}</div>
      </div>
      <div className="mt-3 h-[180px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
