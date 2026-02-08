import React, { useState } from "react";
import { ALLOWED_API_BASES } from "../lib/api.js";

const OPTIONS = Array.from(ALLOWED_API_BASES);

export default function LoginModal({ open, onLogin }) {
  const [apiBase, setApiBase] = useState("https://127.0.0.1:8443");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function submit() {
    setErr("");
    if (!pw.trim()) return setErr("Password required.");
    setBusy(true);
    try {
      await onLogin(apiBase, pw.trim());
      setPw("");
    } catch (e) {
      setErr(e?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md card p-5">
          <div className="text-lg font-semibold">Admin Login</div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Local API Endpoint
              </label>
              <select
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                8443 First, if you are using it, select 7443
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>

            {err && <div className="text-sm text-red-600 dark:text-red-300">{err}</div>}

            <div className="flex justify-end gap-2">
              <button
                onClick={submit}
                disabled={busy}
                className="px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white disabled:opacity-60"
              >
                {busy ? "..." : "Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
