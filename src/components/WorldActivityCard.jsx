import React, { useMemo } from "react";

function calcScore(w) {
  const players = Number(w.players ?? 0);
  const chunks = Number(w.loadedChunks ?? 0);
  const entities = Number(w.entities ?? 0);
  return players * 8 + chunks / 350 + entities / 3000;
}

function getWorldState(w) {
  const score = calcScore(w);

  if (score >= 20) return { key: "active", label: "ACTIVE" };
  if (score >= 8) return { key: "low", label: "LOW" };
  return { key: "idle", label: "IDLE" };
}

const STATE_STYLES = {
  active: {
    dot: "bg-emerald-500 dark:bg-emerald-400",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  },
  low: {
    dot: "bg-amber-500 dark:bg-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  idle: {
    dot: "bg-slate-400 dark:bg-slate-500",
    badge: "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
};

export default function WorldActivityCard({ worlds = [] }) {
  const rows = useMemo(() => {
    const list = Array.isArray(worlds) ? worlds : [];
    return list.map((w) => {
      const st = getWorldState(w);
      const styles = STATE_STYLES[st.key] ?? STATE_STYLES.idle;

      return {
        name: String(w.name ?? "-"),
        players: Number(w.players ?? 0),
        loadedChunks: Number(w.loadedChunks ?? 0),
        entities: Number(w.entities ?? 0),
        stateLabel: st.label,
        styles,
      };
    });
  }, [worlds]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">World Activity</h2>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.name}
            className="
              rounded-2xl border
              border-slate-200 dark:border-slate-800
              bg-slate-50 dark:bg-slate-900
              px-4 py-3
            "
          >
            <div className="flex items-center justify-between gap-4">
              {/* LEFT: name + state */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <div className={`w-2.5 h-2.5 rounded-full ${r.styles.dot}`} />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {r.name}
                  </div>
                  <span
                    className={`
                      inline-flex items-center mt-1
                      text-[11px] px-2 py-0.5 rounded-full border
                      ${r.styles.badge}
                    `}
                  >
                    {r.stateLabel}
                  </span>
                </div>
              </div>

              {/* RIGHT: metrics */}
              <div className="grid grid-cols-3 gap-6 text-right text-sm tabular-nums">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Players</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.players}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Chunks</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.loadedChunks}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Entities</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.entities}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!rows.length && (
          <div className="text-sm text-slate-500 dark:text-slate-400">No world data</div>
        )}
      </div>
    </div>
  );
}
