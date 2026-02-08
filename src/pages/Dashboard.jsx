import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { fmt2 } from "../utils/format.js";
import Card from "../components/Card.jsx";
import ChartPanel from "../components/ChartPanel.jsx";
import WorldActivityCard from "../components/WorldActivityCard";
import MultiLineChart from "../components/MultiLineChart.jsx";
import WorldMemoryCard from "../components/WorldMemoryCard.jsx";

function calcStepSec(rangeSec) {
  const targetPoints = 180;
  let step = Math.round(rangeSec / targetPoints);
  if (step < 5) step = 5;
  if (step > 3600) step = 3600;
  return step;
}

function metricsRefreshMs(rangeSec) {
  if (rangeSec <= 3600) return 10_000;
  if (rangeSec <= 86400) return 60_000;
  return 300_000;
}

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");
  const [rangeSec, setRangeSec] = useState(() => Number(localStorage.getItem("mscp_range") || 1800));
  const [metrics, setMetrics] = useState({ labels: [], tps: [], mspt: [], cpu: [] });

  const statusTimer = useRef(null);
  const metricsTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem("mscp_range", String(rangeSec));
  }, [rangeSec]);

  async function loadStatus() {
    try {
      setErr("");
      const d = await api.status();
      setStatus(d);
    } catch (e) {
      setErr(e?.message || "Failed to load status");
    }
  }

  async function loadMetrics() {
    try {
      setErr("");
      const to = Math.floor(Date.now() / 1000);
      const from = to - rangeSec;
      const step = calcStepSec(rangeSec);
      const d = await api.metrics(from, to, step);

      const pts = d.points || [];
      const labels = pts.map(p => {
        const dt = new Date((p.ts || 0) * 1000);
        return rangeSec > 86400
          ? dt.toLocaleDateString([], { month: "2-digit", day: "2-digit" })
          : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      });

      const firstWorld = pts.find(p => p.world && typeof p.world === "object")?.world || {};
      const worldNames = Object.keys(firstWorld);
      const mkSeries = (field) => worldNames.map((name) => ({
        label: name,
        data: pts.map((p) => {
          const v = p.world?.[name]?.[field];
          return (v === null || v === undefined) ? null : Number(v);
        }),
      }));

      const n = (v) => (v === null || v === undefined) ? null : Number(v);

      setMetrics({
        labels,
        tps: pts.map(p => n(p.tps)),
        mspt: pts.map(p => n(p.mspt)),
        cpu: pts.map(p => n(p.cpuPct)),

        worldMem: mkSeries("memMb"),
        worldPlayers: mkSeries("players"),
        worldChunks: mkSeries("loadedChunks"),
        worldEntities: mkSeries("entities"),
      });
    } catch (e) {
      setErr(e?.message || "Failed to load metrics");
    }
  }

  // Polling
  useEffect(() => {
    loadStatus();
    loadMetrics();

    clearInterval(statusTimer.current);
    statusTimer.current = setInterval(loadStatus, 2000);

    clearInterval(metricsTimer.current);
    metricsTimer.current = setInterval(loadMetrics, metricsRefreshMs(rangeSec));

    return () => {
      clearInterval(statusTimer.current);
      clearInterval(metricsTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeSec]);

  const ok = status?.availability?.networkUp && status?.availability?.heartbeatOk;
  const lastTs = status?.ts ? new Date(status.ts * 1000).toLocaleString() : "-";

  return (
    <div className="space-y-4">
      {err && (
        <div className="card p-3 border-red-200 dark:border-red-900">
          <div className="text-sm text-red-700 dark:text-red-300">{err}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Status" value={ok ? "OK" : "DEGRADED"} sub={`Last: ${lastTs}`} accent={ok ? "ok" : "warn"} />
        <Card title="TPS" value={fmt2(status?.perf?.tps)} sub="Target: 20.0" />
        <Card title="MSPT" value={fmt2(status?.perf?.mspt)} sub="Lower is better" />
        <Card title="Online / Registered" value={`${status?.counts?.online ?? "-"} / ${status?.counts?.registered ?? "-"}`} sub={`Server: ${status?.serverId ?? "-"}`} />
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold">History Range</div>
        <select
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          value={rangeSec}
          onChange={(e) => setRangeSec(Number(e.target.value))}
        >
          <option value={60}>1m</option>
          <option value={1800}>30m</option>
          <option value={3600}>1h</option>
          <option value={86400}>1d</option>
          <option value={604800}>1w</option>
        </select>

        <button
          onClick={loadMetrics}
          className="ml-auto px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="card p-4">
          <div className="font-semibold">System</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">CPU</div>
              <div className="text-lg font-bold mt-1">{fmt2(status?.system?.cpuPct)}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">load1: {fmt2(status?.system?.load1)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Memory</div>
              <div className="text-lg font-bold mt-1">
                {status?.perf?.memUsedMb ?? "-"} / {status?.perf?.memMaxMb ?? "-"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">MB used / max</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Disk</div>
              <div className="text-lg font-bold mt-1">{fmt2(status?.system?.diskUsedPct)}%</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Network</div>
              <div className="mt-1">IN: {fmt2(status?.system?.netInKbps)} kbps</div>
              <div>OUT: {fmt2(status?.system?.netOutKbps)} kbps</div>
            </div>
          </div>
        </div>
        <WorldActivityCard worlds={status?.worlds || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPanel title="TPS" labels={metrics.labels} values={metrics.tps} unit="" />
        <ChartPanel title="MSPT" labels={metrics.labels} values={metrics.mspt} unit="ms" />
        <ChartPanel title="CPU" labels={metrics.labels} values={metrics.cpu} unit="%" />
        <MultiLineChart title="World Memory (MB)" labels={metrics.labels} series={metrics.worldMem || []} unit=" MB" />
        <WorldMemoryCard worlds={status?.worlds || []} totalMemUsed={status?.perf?.memUsedMb || 0} />
        <MultiLineChart title="World Players" labels={metrics.labels} series={metrics.worldPlayers || []} unit="" />
        <MultiLineChart title="World Loaded Chunks" labels={metrics.labels} series={metrics.worldChunks || []} unit="" />
        <MultiLineChart title="World Entities" labels={metrics.labels} series={metrics.worldEntities || []} unit="" />
      </div>
    </div>
  );
}
