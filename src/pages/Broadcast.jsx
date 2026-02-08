import React, { useEffect, useMemo, useState } from "react";
import { api, getApiBase } from "../lib/api.js";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function fmtTs(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

function ScheduleModal({ initial, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(() => initial?.name || "");
  const [message, setMessage] = useState(() => initial?.message || "");
  const [intervalSec, setIntervalSec] = useState(() => initial?.intervalSec ?? 300);
  const [enabled, setEnabled] = useState(() => initial?.enabled ?? true);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">{isEdit ? "Edit Schedule" : "New Schedule"}</div>
              <div className="text-xs text-slate-500 mt-1">/api/broadcast/schedules</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <div className="text-xs text-slate-500">Name</div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                placeholder="e.g. Daily reminder"
              />
            </div>

            <div>
              <div className="text-xs text-slate-500">Message</div>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Broadcast message..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Interval (sec)</div>
                <input
                  type="number"
                  min={5}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(parseInt(e.target.value, 10) || 0)}
                />
                <div className="text-xs text-slate-400 mt-1">min: 5s</div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  id="schEnabled"
                  type="checkbox"
                  className="scale-110"
                  checked={!!enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <label htmlFor="schEnabled" className="text-sm text-slate-700">
                  Enabled
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onSave({
                    id: initial?.id ?? null,
                    name: name.trim(),
                    message: message.trim(),
                    intervalSec: Number(intervalSec),
                    enabled: !!enabled,
                  })
                }
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function Broadcast() {
  const apiBase = getApiBase();

  // Send now
  const [msg, setMsg] = useState("");
  const [sendBusy, setSendBusy] = useState(false);

  // Schedules
  const [schedules, setSchedules] = useState([]);
  const [schBusy, setSchBusy] = useState(false);

  // UI
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const total = useMemo(() => schedules.length, [schedules]);

  async function loadSchedules() {
    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      return;
    }
    setSchBusy(true);
    setErr("");
    setNotice("");
    try {
      const d = await api.broadcastSchedulesList();
      setSchedules(Array.isArray(d?.items) ? d.items : []);
    } catch (e) {
      setErr(e?.message || "Failed to load schedules");
      setSchedules([]);
    } finally {
      setSchBusy(false);
    }
  }

  useEffect(() => {
    if (apiBase) loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function sendNow() {
    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      return;
    }
    const m = msg.trim();
    if (!m) return;

    setSendBusy(true);
    setErr("");
    setNotice("");
    try {
      await api.broadcastSend(m);
      setMsg("");
      setNotice("Broadcast sent.");
    } catch (e) {
      setErr(e?.message || "Failed to send broadcast");
    } finally {
      setSendBusy(false);
    }
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditing(s);
    setModalOpen(true);
  }

  async function saveSchedule(payload) {
    const { id, name, message, intervalSec, enabled } = payload;

    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      return;
    }
    if (!name || !message) {
      setErr("Name and Message are required.");
      return;
    }
    if (!Number.isFinite(intervalSec) || intervalSec < 5) {
      setErr("intervalSec must be >= 5");
      return;
    }

    setSchBusy(true);
    setErr("");
    setNotice("");
    try {
      if (!id) {
        await api.broadcastSchedulesCreate({
          name,
          message,
          intervalSec,
          enabled,
          startAt: Math.floor(Date.now() / 1000),
        });
        setNotice("Schedule created.");
      } else {
        await api.broadcastSchedulesUpdate(id, { name, message, intervalSec, enabled });
        setNotice("Schedule updated.");
      }
      setModalOpen(false);
      setEditing(null);
      await loadSchedules();
    } catch (e) {
      setErr(e?.message || "Failed to save schedule");
    } finally {
      setSchBusy(false);
    }
  }

  async function toggleSchedule(s) {
    if (!apiBase) return;
    setSchBusy(true);
    setErr("");
    setNotice("");
    try {
      await api.broadcastSchedulesUpdate(s.id, { enabled: !s.enabled });
      await loadSchedules();
    } catch (e) {
      setErr(e?.message || "Failed to update schedule");
    } finally {
      setSchBusy(false);
    }
  }

  async function deleteSchedule(s) {
    if (!apiBase) return;
    if (!window.confirm("Delete this schedule?")) return;

    setSchBusy(true);
    setErr("");
    setNotice("");
    try {
      await api.broadcastSchedulesDelete(s.id);
      setNotice("Schedule deleted.");
      await loadSchedules();
    } catch (e) {
      setErr(e?.message || "Failed to delete schedule");
    } finally {
      setSchBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div>
            <div className="font-semibold">Broadcast</div>
          </div>

          <div className="flex-1" />

          <button
            className={cx(
              "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50",
              (schBusy || !apiBase) && "opacity-50 cursor-not-allowed"
            )}
            disabled={schBusy || !apiBase}
            onClick={loadSchedules}
          >
            Reload
          </button>

          <button
            className={cx(
              "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500",
              (schBusy || !apiBase) && "opacity-50 cursor-not-allowed"
            )}
            disabled={schBusy || !apiBase}
            onClick={openNew}
          >
            New Schedule
          </button>
        </div>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
        {notice && !err && <div className="mt-3 text-sm text-slate-700">{notice}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Send Now */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Send Now</div>
          </div>

          <textarea
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            rows={5}
            placeholder="Message"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            disabled={sendBusy}
          />

          <div className="flex items-center gap-2">
            <button
              className={cx(
                "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500",
                (!apiBase || sendBusy || !msg.trim()) && "opacity-50 cursor-not-allowed"
              )}
              disabled={!apiBase || sendBusy || !msg.trim()}
              onClick={sendNow}
            >
              Send
            </button>

            <button
              className={cx(
                "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50",
                sendBusy && "opacity-50 cursor-not-allowed"
              )}
              disabled={sendBusy}
              onClick={() => setMsg("")}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Schedules */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">Schedules</div>
              <div className="text-xs text-slate-500">Total: {total}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-600">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2 w-[110px]">Interval</th>
                  <th className="text-left py-2 px-2 w-[110px]">Enabled</th>
                  <th className="text-left py-2 px-2 w-[220px]">Actions</th>
                </tr>
              </thead>

              <tbody className="text-slate-900">
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 px-2">
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-2">{s.message}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Updated: {fmtTs(s.updatedAt)}
                      </div>
                    </td>

                    <td className="py-2 px-2 text-slate-700 tabular-nums">{s.intervalSec}s</td>

                    <td className="py-2 px-2">
                      {s.enabled ? (
                        <span className="inline-flex px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                          ON
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs">
                          OFF
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => openEdit(s)}
                          disabled={schBusy}
                        >
                          Edit
                        </button>

                        <button
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => toggleSchedule(s)}
                          disabled={schBusy}
                        >
                          {s.enabled ? "Disable" : "Enable"}
                        </button>

                        <button
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          onClick={() => deleteSchedule(s)}
                          disabled={schBusy}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!schBusy && schedules.length === 0 && (
                  <tr>
                    <td className="py-10 text-center text-slate-500" colSpan={4}>
                      {apiBase ? "No schedules" : "Login required"}
                    </td>
                  </tr>
                )}

                {schBusy && (
                  <tr>
                    <td className="py-10 text-center text-slate-500" colSpan={4}>
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ScheduleModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={saveSchedule}
        />
      )}
    </div>
  );
}
