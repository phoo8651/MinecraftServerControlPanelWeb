import React, { useEffect, useMemo, useState } from "react";
import { api, getApiBase } from "../lib/api.js";

function fmtTs(unixTs) {
  if (!unixTs) return "-";
  try {
    return new Date(unixTs * 1000).toLocaleString();
  } catch {
    return String(unixTs);
  }
}

function pill(text, tone = "slate") {
  const toneMap = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full border text-xs ${toneMap[tone] || toneMap.slate}`}>
      {text}
    </span>
  );
}

function inferType(type, value) {
  const t = String(type || "").toLowerCase();
  if (t === "bool" || t === "int" || t === "string") return t;

  // fallback inference
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number" && Number.isFinite(value)) return "int";
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "false") return "bool";
    if (/^-?\d+$/.test(s)) return "int";
  }
  return "string";
}

function normalizeValue(type, raw) {
  if (type === "bool") return !!raw;
  if (type === "int") {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  return String(raw ?? "");
}

function equalsByType(type, a, b) {
  if (type === "bool") return !!a === !!b;
  if (type === "int") return Number(a) === Number(b);
  return String(a ?? "") === String(b ?? "");
}

function buildChangesValue(type, value) {
  if (type === "bool") return !!value;
  if (type === "int") return Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
  return String(value ?? "");
}

export default function Rules() {
  const apiBase = getApiBase();

  const [rules, setRules] = useState([]); // {key,type,value,updatedAt}
  const [pending, setPending] = useState({}); // key -> value
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const rulesMap = useMemo(() => {
    const m = new Map();
    for (const r of rules) m.set(r.key, r);
    return m;
  }, [rules]);

  const pendingCount = useMemo(() => Object.keys(pending).length, [pending]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => String(r.key).toLowerCase().includes(q));
  }, [rules, search]);

  async function loadRules() {
    setErr("");
    setNotice("");

    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.gamerules();
      const list = Array.isArray(data?.rules) ? data.rules : [];
      const normalized = list.map((r) => {
        const rt = inferType(r.type, r.value);
        return {
          key: r.key,
          type: rt,
          value: normalizeValue(rt, r.value),
          updatedAt: r.updatedAt ?? null,
        };
      });
      setRules(normalized);
    } catch (e) {
      setErr(e?.message || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (apiBase) loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  function getEffectiveValue(rule) {
    if (Object.prototype.hasOwnProperty.call(pending, rule.key)) {
      return normalizeValue(rule.type, pending[rule.key]);
    }
    return normalizeValue(rule.type, rule.value);
  }

  function setPendingValue(rule, nextValue) {
    const base = rulesMap.get(rule.key);
    const baseVal = base ? base.value : rule.value;

    const nv = normalizeValue(rule.type, nextValue);
    const same = equalsByType(rule.type, nv, baseVal);

    setPending((prev) => {
      const next = { ...prev };
      if (same) delete next[rule.key];
      else next[rule.key] = nv;
      return next;
    });
  }

  async function applyPending() {
    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      return;
    }
    if (pendingCount === 0) return;

    setErr("");
    setNotice("");
    setBusy(true);

    try {
      const changes = {};
      for (const k of Object.keys(pending)) {
        const rule = rulesMap.get(k);
        if (!rule) continue;
        changes[k] = buildChangesValue(rule.type, pending[k]);
      }

      const data = await api.patchGamerules(changes);
      const applied = data?.applied?.length ?? 0;
      const failed = data?.failed?.length ?? 0;

      setNotice(`Applied: ${applied}, Failed: ${failed}`);
      setPending({});
      await loadRules();
    } catch (e) {
      setErr(e?.message || "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  function clearPending() {
    setPending({});
    setNotice("Pending cleared");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="font-semibold">Game Rules</div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-64"
              placeholder="Search rule key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading || busy}
            />

            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={loadRules}
              disabled={loading || busy || !apiBase}
            >
              {loading ? "Loading..." : "Reload"}
            </button>

            <button
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              onClick={applyPending}
              disabled={busy || pendingCount === 0 || !apiBase}
            >
              Apply ({pendingCount})
            </button>

            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={clearPending}
              disabled={busy || pendingCount === 0}
            >
              Clear Pending
            </button>
          </div>
        </div>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        {notice && !err && <div className="mt-3 text-sm text-slate-700">{notice}</div>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 w-[260px]">Key</th>
                <th className="text-left py-2 w-[120px]">Type</th>
                <th className="text-left py-2">Value</th>
                <th className="text-left py-2 w-[220px]">Updated</th>
                <th className="text-left py-2 w-[120px]">Pending</th>
              </tr>
            </thead>

            <tbody className="text-slate-900">
              {filteredRules.map((r) => {
                const v = getEffectiveValue(r);
                const isPending = Object.prototype.hasOwnProperty.call(pending, r.key);

                return (
                  <tr key={r.key} className="border-b border-slate-100 align-middle">
                    <td className="py-2 font-mono text-xs text-slate-800">{r.key}</td>
                    <td className="py-2">{pill(r.type, "slate")}</td>

                    <td className="py-2">
                      {r.type === "bool" ? (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="scale-110"
                            checked={!!v}
                            onChange={(e) => setPendingValue(r, e.target.checked)}
                            disabled={busy}
                          />
                          <span className="text-xs text-slate-600">{v ? "true" : "false"}</span>
                        </label>
                      ) : r.type === "int" ? (
                        <input
                          type="number"
                          className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={Number(v)}
                          onChange={(e) => setPendingValue(r, e.target.value)}
                          disabled={busy}
                        />
                      ) : (
                        <input
                          type="text"
                          className="w-full min-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={String(v ?? "")}
                          onChange={(e) => setPendingValue(r, e.target.value)}
                          disabled={busy}
                        />
                      )}
                    </td>

                    <td className="py-2 text-slate-600 text-xs">{fmtTs(r.updatedAt)}</td>

                    <td className="py-2">
                      {isPending ? pill("PENDING", "amber") : <span className="text-xs text-slate-400">-</span>}
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredRules.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={5}>
                    {apiBase ? "No rules" : "Login required"}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={5}>
                    Loading...
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
