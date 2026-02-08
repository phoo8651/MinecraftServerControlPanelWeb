import React, { useEffect, useMemo, useState } from "react";
import { api, getApiBase } from "../lib/api.js";

const LS_CONSOLE_HISTORY = "MSCP_CONSOLE_HISTORY_V1";
const MAX_HISTORY = 200;

function fmtTs(tsSec) {
  if (!tsSec) return "-";
  try {
    return new Date(tsSec * 1000).toLocaleString();
  } catch {
    return String(tsSec);
  }
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ConsolePage() {
  const apiBase = getApiBase();

  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_CONSOLE_HISTORY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_CONSOLE_HISTORY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {
      // ignore
    }
  }, [history]);

  const canSend = useMemo(() => {
    return !!apiBase && !busy && !!cmd.trim();
  }, [apiBase, busy, cmd]);

  function pushHistory(item) {
    setHistory((prev) => [item, ...prev].slice(0, MAX_HISTORY));
  }

  async function send() {
    const c = cmd.trim();
    if (!c) return;

    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      return;
    }

    setBusy(true);
    setErr("");
    setNotice("");

    const ts = Math.floor(Date.now() / 1000);

    try {
      const res = await api.consoleCommand(c);

      pushHistory({
        id: `${ts}-${Math.random().toString(16).slice(2)}`,
        ts,
        command: c,
        ok: true,
        message: res?.message || "OK",
        raw: res || null,
      });

      setCmd("");
      setNotice("Command sent.");
    } catch (e) {
      const msg = e?.message || "Command failed";
      pushHistory({
        id: `${ts}-${Math.random().toString(16).slice(2)}`,
        ts,
        command: c,
        ok: false,
        message: msg,
        raw: null,
      });
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  function clearHistory() {
    if (!window.confirm("Clear console history?")) return;
    setHistory([]);
  }

  function reRun(h) {
    setCmd(h.command);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied.");
    } catch {
      setErr("Copy failed.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div>
            <div className="font-semibold">Console</div>
          </div>

          <div className="flex-1" />

          <button
            className={cx(
              "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50",
              (!history.length || busy) && "opacity-50 cursor-not-allowed"
            )}
            disabled={!history.length || busy}
            onClick={clearHistory}
          >
            Clear History
          </button>
        </div>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        {notice && !err && <div className="mt-3 text-sm text-slate-700">{notice}</div>}
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Send Command</div>
        </div>

        <textarea
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
          rows={3}
          placeholder="예: say Hello from console"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) send();
            }
          }}
        />

        <div className="flex items-center gap-2">
          <button
            className={cx(
              "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500",
              !canSend && "opacity-50 cursor-not-allowed"
            )}
            disabled={!canSend}
            onClick={send}
          >
            Send
          </button>

          <button
            className={cx(
              "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50",
              busy && "opacity-50 cursor-not-allowed"
            )}
            disabled={busy}
            onClick={() => setCmd("")}
          >
            Clear
          </button>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">History</div>
          <div className="text-xs text-slate-500">Stored locally (browser)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 w-[180px]">Time</th>
                <th className="text-left py-2 px-2">Command</th>
                <th className="text-left py-2 px-2 w-[90px]">Result</th>
                <th className="text-left py-2 px-2 w-[240px]">Actions</th>
              </tr>
            </thead>

            <tbody className="text-slate-900">
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 px-2 text-slate-600 text-xs">{fmtTs(h.ts)}</td>

                  <td className="py-2 px-2">
                    <div className="font-mono text-xs whitespace-pre-wrap break-words">
                      {h.command}
                    </div>
                    {h.message && (
                      <div className={cx("text-xs mt-1", h.ok ? "text-slate-500" : "text-red-600")}>
                        {h.message}
                      </div>
                    )}
                  </td>

                  <td className="py-2 px-2">
                    {h.ok ? (
                      <span className="inline-flex px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs">
                        ERR
                      </span>
                    )}
                  </td>

                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        onClick={() => reRun(h)}
                      >
                        Reuse
                      </button>

                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        onClick={() => copy(h.command)}
                      >
                        Copy Cmd
                      </button>

                      {h.raw && (
                        <button
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => copy(JSON.stringify(h.raw, null, 2))}
                        >
                          Copy JSON
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!history.length && (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={4}>
                    No history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Up to {MAX_HISTORY} records are stored.
        </div>
      </div>
    </div>
  );
}
