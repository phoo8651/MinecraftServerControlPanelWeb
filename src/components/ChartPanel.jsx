import React, { useMemo } from "react";
import { fmt2 } from "../utils/format.js";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, TimeScale
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function cssRgb(varName) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); // "R G B"
  return `rgb(${v})`;
}
function cssRgba(varName, a) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return `rgba(${v} / ${a})`;
}

export default function ChartPanel({ title, labels, values, unit = "" }) {
  const colors = useMemo(() => ({
    text: cssRgb("--chart-text"),
    grid: cssRgba("--chart-grid", 0.35),
    line: cssRgb("--chart-line"),
    fill: cssRgba("--chart-fill", 0.18),
  }), [document.documentElement.classList.contains("dark")]); // eslint-disable-line

  const data = useMemo(() => ({
    labels,
    datasets: [{
      label: title,
      data: values,
      borderColor: colors.line,
      backgroundColor: colors.fill,
      fill: true,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.25,
    }]
  }), [labels, values, title, colors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (ctx) => `${fmt2(ctx.parsed.y)}${unit}`,
        }
      }
    },
    scales: {
      x: {
        grid: { color: colors.grid },
        ticks: { color: colors.text, maxTicksLimit: 6 },
      },
      y: {
        grid: { color: colors.grid },
        ticks: {
          color: colors.text,
          maxTicksLimit: 5,
          callback: (value) => `${fmt2(value)}`,
        }
      },
    }
  }), [colors, unit]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{unit ? `unit: ${unit}` : ""}</div>
      </div>
      <div className="mt-3 h-[140px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
