import React from "react";

export default function WorldMemoryCard({ worlds = [], totalMemUsed = 0 }) {
  const total = Math.max(1, Number(totalMemUsed || 0));
  const sorted = [...worlds].sort((a, b) => (b.memMb || 0) - (a.memMb || 0));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">World Memory Share</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">used: {totalMemUsed || "-"} MB</div>
      </div>

      <div className="mt-3 space-y-3">
        {sorted.map((w) => {
          const mb = Number(w.memMb || 0);
          const pct = Math.round((mb / total) * 1000) / 10;
          return (
            <div key={w.name}>
              <div className="flex items-center justify-between text-sm">
                <div className="font-semibold">{w.name}</div>
                <div className="text-slate-500 dark:text-slate-400">{mb} MB · {pct}%</div>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
        {!sorted.length && <div className="text-sm text-slate-500 dark:text-slate-400">No data</div>}
      </div>
    </div>
  );
}
