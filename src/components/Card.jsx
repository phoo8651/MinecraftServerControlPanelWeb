import React from "react";

export default function Card({ title, value, sub, accent }) {
  const accentClass =
    accent === "ok"
      ? "text-emerald-700 dark:text-emerald-200"
      : accent === "warn"
      ? "text-amber-700 dark:text-amber-200"
      : "";

  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      <div className={`text-xl font-bold mt-1 ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
