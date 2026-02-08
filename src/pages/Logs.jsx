import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

function fmtTs(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

const PLAYER_TYPES = [
  { value: "all", label: "All" },
  { value: "join", label: "Join" },
  { value: "leave", label: "Leave" },
  { value: "chat", label: "Chat" },
  { value: "death", label: "Death" },
];

const SERVER_TYPES = [
  { value: "all", label: "All" },
  { value: "start", label: "Start" },
  { value: "stop", label: "Stop" },
  { value: "save", label: "Save" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
  { value: "info", label: "Info" },
];

const RANGE_PRESETS = [
  { key: "15m", label: "15m", sec: 15 * 60 },
  { key: "30m", label: "30m", sec: 30 * 60 },
  { key: "1h", label: "1h", sec: 60 * 60 },
  { key: "3h", label: "3h", sec: 3 * 60 * 60 },
  { key: "6h", label: "6h", sec: 6 * 60 * 60 },
  { key: "12h", label: "12h", sec: 12 * 60 * 60 },
  { key: "24h", label: "24h", sec: 24 * 60 * 60 },
  { key: "1w", label: "1w", sec: 7 * 24 * 60 * 60 },
  { key: "1mo", label: "1mo", sec: 30 * 24 * 60 * 60 },
  { key: "all", label: "ALL", sec: null },
  { key: "custom", label: "Custom", sec: null },
];

const RANGE_OPTIONS = [
  { value: "15m", label: "최근 15분" },
  { value: "30m", label: "최근 30분" },
  { value: "1h", label: "최근 1시간" },
  { value: "3h", label: "최근 3시간" },
  { value: "6h", label: "최근 6시간" },
  { value: "12h", label: "최근 12시간" },
  { value: "24h", label: "최근 24시간" },
  { value: "1w", label: "최근 1주일" },
  { value: "1mo", label: "최근 1달" },
  { value: "all", label: "전체" },
  { value: "custom", label: "기간 지정" },
];

const LIMIT_OPTIONS = [10, 25, 50, 75, 100].map((n) => ({
  value: String(n),
  label: `${n}/page`,
}));


function toLocalInputValue(tsSec) {
  if (!tsSec) return "";
  const d = new Date(tsSec * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v) {
  if (!v) return null;
  const d = new Date(v);
  const ts = Math.floor(d.getTime() / 1000);
  return Number.isFinite(ts) ? ts : null;
}

export default function Logs() {
  // 상단: scope + 검색
  const [mode, setMode] = useState("player"); // "player" | "server"
  const [playerQuery, setPlayerQuery] = useState("");
  const [query, setQuery] = useState("");

  // 하단: 기간/타입/표시개수
  const [rangeKey, setRangeKey] = useState("15m"); // 기본 15분
  const [customFrom, setCustomFrom] = useState(null); // unix sec
  const [customTo, setCustomTo] = useState(null); // unix sec
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(50);

  // paging
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // data
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const types = useMemo(() => (mode === "player" ? PLAYER_TYPES : SERVER_TYPES), [mode]);

  const title = "Logs";
  const subtitle =
    mode === "player"
      ? "Player logs: Join/Leave, Chat, Death"
      : "Server event logs";

  function calcFromTo() {
    const preset = RANGE_PRESETS.find((p) => p.key === rangeKey) || RANGE_PRESETS[0];
    const now = Math.floor(Date.now() / 1000);

    if (preset.key === "all") {
      return { from: 0, to: now };
    }
    if (preset.key === "custom") {
      const f = customFrom ?? (now - 15 * 60);
      const t = customTo ?? now;
      return { from: Math.min(f, t), to: Math.max(f, t) };
    }
    return { from: now - (preset.sec || 15 * 60), to: now };
  }

  async function load(nextPage = page, nextMode = mode) {
    setBusy(true);
    setErr("");

    try {
      const { from, to } = calcFromTo();
      const params = {
        page: String(nextPage),
        limit: String(limit),
        type,
        query: query.trim(),
        from: String(from),
        to: String(to),
      };

      let data;
      if (nextMode === "player") {
        const pq = playerQuery.trim();
        const req = { ...params, ...(pq ? { player: pq } : {}) };
        data = await api.playerLogs(req);
      } else {
        data = await api.serverLogs(params);
      }

      setPage(data.page ?? nextPage);
      setTotal(data.total ?? 0);
      setItems(data.items ?? []);
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setType("all");
    setPage(1);
    load(1, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    setPage(1);
    load(1, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, type, limit]);

  function onSearch() {
    setPage(1);
    load(1, mode);
  }

  const showCustom = rangeKey === "custom";

  return (
    <div className="space-y-4">
      {/* Header + Toolbars */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-4">
          <div className="min-w-[220px]">
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-slate-500">{subtitle}</div>
          </div>

          <div className="flex-1" />

          {/* TOP BAR: scope + player + query + search */}
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max flex-nowrap pb-1">
              {/* Mode toggle */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  className={cx(
                    "px-3 py-1.5 text-sm rounded-md",
                    mode === "player" ? "bg-white border border-slate-200" : "text-slate-600"
                  )}
                  onClick={() => setMode("player")}
                  disabled={busy}
                >
                  Player
                </button>
                <button
                  className={cx(
                    "px-3 py-1.5 text-sm rounded-md",
                    mode === "server" ? "bg-white border border-slate-200" : "text-slate-600"
                  )}
                  onClick={() => setMode("server")}
                  disabled={busy}
                >
                  Server
                </button>
              </div>

              {/* Player name/uuid (always visible, disabled in server mode) */}
              <input
                className={cx(
                  "rounded-lg border px-3 py-2 text-sm w-56",
                  mode === "player"
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-100 text-slate-400"
                )}
                placeholder="Player name or uuid"
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                disabled={busy || mode !== "player"}
              />

              {/* Search message */}
              <input
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-64"
                placeholder="Search message..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                disabled={busy}
              />

              {/* Search button */}
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                onClick={onSearch}
                disabled={busy}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR: range + type + limit */}
        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
          <div className="justify-end flex-1 flex">
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max flex-nowrap pb-1">
                {/* Range dropdown */}
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={rangeKey}
                  onChange={(e) => setRangeKey(e.target.value)}
                  disabled={busy}
                  title="Time range"
                >
                  <option value="15m">last 15m</option>
                  <option value="30m">last 30m</option>
                  <option value="1h">last 1h</option>
                  <option value="3h">last 3h</option>
                  <option value="6h">last 6h</option>
                  <option value="12h">last 12h</option>
                  <option value="24h">last 24h</option>
                  <option value="1w">last 1w</option>
                  <option value="1mo">last 1mo</option>
                  <option value="all">all</option>
                  <option value="custom">custom range</option>
                </select>

                {/* Custom from/to */}
                <div className={cx("flex items-center gap-2", showCustom ? "" : "opacity-40")}>
                  <span className="text-xs text-slate-500">From</span>
                  <input
                    type="datetime-local"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={toLocalInputValue(customFrom)}
                    onChange={(e) => setCustomFrom(fromLocalInputValue(e.target.value))}
                    disabled={busy || !showCustom}
                  />
                  <span className="text-xs text-slate-500">To</span>
                  <input
                    type="datetime-local"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={toLocalInputValue(customTo)}
                    onChange={(e) => setCustomTo(fromLocalInputValue(e.target.value))}
                    disabled={busy || !showCustom}
                  />
                </div>

                {/* Type */}
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={busy}
                  title="Log type"
                >
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                {/* Limit */}
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={busy}
                  title="Items per page"
                >
                  {[10, 25, 50, 75, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => load(1, mode)}
                  disabled={busy}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600">
            Total: <span className="font-semibold text-slate-900">{total}</span>
            {busy && <span className="ml-2 text-slate-400">Loading...</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={() => load(Math.max(1, page - 1), mode)}
              disabled={busy || page <= 1}
            >
              Prev
            </button>
            <div className="text-sm text-slate-700">
              Page <span className="font-semibold">{page}</span>
            </div>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={() => load(page + 1, mode)}
              disabled={busy || page * limit >= total}
            >
              Next
            </button>
          </div>
        </div>

        {/* stable columns */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 w-[180px]">Time</th>
                <th className="text-left py-2 w-[220px]">Actor</th>
                <th className="text-left py-2 w-[120px]">Type</th>
                <th className="text-left py-2">Message</th>
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {items.map((it) => {
                const actorName = mode === "player" ? (it.playerName || "-") : "SERVER";
                const actorSub =
                  mode === "player" ? (it.playerUuid ? it.playerUuid.slice(0, 8) + "…" : "-") : "";

                return (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{fmtTs(it.ts)}</td>
                    <td className="py-2">
                      <div className="font-semibold">{actorName}</div>
                      {actorSub && <div className="text-xs text-slate-500 font-mono">{actorSub}</div>}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs">
                        {it.type}
                      </span>
                    </td>
                    <td className="py-2 whitespace-pre-wrap break-words text-slate-800">
                      {it.message || "-"}
                    </td>
                  </tr>
                );
              })}

              {!items.length && (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={4}>
                    {busy ? "Loading..." : "No logs"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
