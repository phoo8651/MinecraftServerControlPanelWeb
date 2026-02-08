import React, { useEffect, useMemo, useState } from "react";
import { api, getApiBase } from "../lib/api.js";
import { createPortal } from "react-dom";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function shortUuid(u) {
  if (!u) return "-";
  return u.length > 10 ? `${u.slice(0, 8)}…` : u;
}

function badgeStatus(u) {
  const banned = !!u.banned;
  const online = !!u.online;

  if (banned) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-red-700">Banned</span>
      </span>
    );
  }

  if (online) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-emerald-700">Online</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-slate-400" />
      <span className="text-xs text-slate-500">Offline</span>
    </span>
  );
}

function charInfo(ch) {
  const c = ch.toLowerCase();
  if (c >= "0" && c <= "9") return { group: "digit", v: c.charCodeAt(0) - 48 };
  if (c >= "a" && c <= "z") return { group: "alpha", v: c.charCodeAt(0) - 97 };
  return { group: "other", v: c.codePointAt(0) ?? 0 };
}

function groupRank(info, dir) {
  if (dir === "asc") {
    return info.group === "digit" ? 0 : info.group === "alpha" ? 1 : 2;
  }
  return info.group === "alpha" ? 0 : info.group === "digit" ? 1 : 2;
}

function compareAlphaNum(a, b, dir = "asc") {
  const s1 = String(a ?? "");
  const s2 = String(b ?? "");

  const n = Math.min(s1.length, s2.length);
  for (let i = 0; i < n; i++) {
    const i1 = charInfo(s1[i]);
    const i2 = charInfo(s2[i]);

    const g1 = groupRank(i1, dir);
    const g2 = groupRank(i2, dir);
    if (g1 !== g2) return g1 - g2;

    const v1 = dir === "asc" ? i1.v : -i1.v;
    const v2 = dir === "asc" ? i2.v : -i2.v;
    if (v1 !== v2) return v1 - v2;
  }

  return dir === "asc" ? (s1.length - s2.length) : (s2.length - s1.length);
}

/** Action Modal (catalog 기반) */
function ActionModal({ open, onClose, onRun, user, action, registryUsers = [] }) {
  const [form, setForm] = useState({});

  if (!open || !user || !action) return null;

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function renderField(f) {
    const key = f.key;
    const type = f.type;
    const required = !!f.required;

    const label = (
      <div className="text-xs text-slate-500">
        {key} {required && <span className="text-red-500">*</span>}
      </div>
    );

    if (action.id === "teleport_to_player" && key === "toUuid") {
      const listId = `tp_target_list_${user.uuid}`;
      return (
        <div key={key} className="space-y-1 md:col-span-2">
          {label}
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Target player"
            value={form[key] ?? ""}
            onChange={(e) => setField(key, e.target.value)}
            list={listId}
          />
          <datalist id={listId}>
            {registryUsers.map((u) => (
              <React.Fragment key={u.uuid}>
                <option value={u.name} />
              </React.Fragment>
            ))}
          </datalist>
        </div>
      );
    }


    if (type === "bool") {
      return (
        <div key={key} className="space-y-1">
          {label}
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="scale-110"
              checked={!!form[key]}
              onChange={(e) => setField(key, e.target.checked)}
            />
            <span className="text-sm text-slate-700">true/false</span>
          </label>
        </div>
      );
    }

    if (type === "enum") {
      const choices = Array.isArray(f.choices) ? f.choices : [];
      const v = form[key] ?? (choices[0] ?? "");
      return (
        <div key={key} className="space-y-1">
          {label}
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={v}
            onChange={(e) => setField(key, e.target.value)}
          >
            {choices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const inputType = type === "int" || type === "number" ? "number" : "text";
    return (
      <div key={key} className="space-y-1">
        {label}
        <input
          type={inputType}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={form[key] ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (type === "int") setField(key, v === "" ? "" : parseInt(v, 10));
            else if (type === "number") setField(key, v === "" ? "" : Number(v));
            else setField(key, v);
          }}
          min={f.min}
          max={f.max}
          placeholder={f.placeholder || ""}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">{action.label || action.id}</div>
              <div className="text-xs text-slate-500 mt-1">
                {user.name} ({shortUuid(user.uuid)}) · {action.category || "-"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3">
            {(action.fields || []).length === 0 ? (
              <div className="text-sm text-slate-600">No parameters</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(action.fields || []).map(renderField)}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onRun(form)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPicker({ disabled, actions, onPick }) {
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0, placement: "down" });

  const grouped = React.useMemo(() => {
    const map = new Map();
    for (const a of actions) {
      const cat = a.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(a);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [actions]);

  function close() {
    setOpen(false);
  }

  function toggle() {
    if (disabled) return;
    setOpen((v) => !v);
  }

  // 버튼 위치 기준으로 초기 배치 계산
  function computeInitialPos() {
    const el = btnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const margin = 8;

    const menuWidth = 280;
    const preferDownSpace = window.innerHeight - rect.bottom;
    const preferUpSpace = rect.top;

    const placement = preferDownSpace >= 280 ? "down" : (preferUpSpace >= 280 ? "up" : "down");

    let left = rect.right - menuWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

    let top = placement === "down" ? rect.bottom + margin : rect.top - margin;

    setPos({ top, left, placement });
  }

  React.useEffect(() => {
    if (!open) return;
    computeInitialPos();
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const el = btnRef.current;
    const m = menuRef.current;
    if (!el || !m) return;

    const rect = el.getBoundingClientRect();
    const margin = 8;

    const menuRect = m.getBoundingClientRect();
    const menuH = menuRect.height;

    let top = pos.top;
    if (pos.placement === "up") {
      top = rect.top - margin - menuH;
    } else {
      top = rect.bottom + margin;
    }

    top = Math.max(margin, Math.min(top, window.innerHeight - menuH - margin));

    setPos((p) => ({ ...p, top }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const isInside = (evt, el) => {
      if (!el) return false;
      const path = evt?.composedPath?.();
      if (path && path.includes(el)) return true;
      return el.contains(evt.target);
    };

    function onDocMouseDown(e) {
      const btn = btnRef.current;
      const menu = menuRef.current;

      if (isInside(e, btn) || isInside(e, menu)) return;
      close();
    }

    function onKeyDown(e) {
      if (e.key === "Escape") close();
    }

    function onScroll(e) {
      const menu = menuRef.current;

      if (isInside(e, menu)) return;

      close();
    }

    function onResize() {
      close();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);


  return (
    <>
      <button
        ref={btnRef}
        disabled={disabled}
        onClick={toggle}
        className={cx(
          "shrink-0 rounded-lg border px-2 py-1 text-xs inline-flex items-center gap-1",
          disabled
            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
            : "border-slate-200 bg-white hover:bg-slate-50"
        )}
      >
        Actions <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {open && !disabled &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 280, zIndex: 9999 }}
            className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
          >
            <div className="max-h-72 overflow-auto p-2">
              {grouped.map(([cat, list]) => (
                <div key={cat} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-slate-500">{cat}</div>
                  <div className="space-y-1">
                    {list.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          close();
                          onPick(a.id);
                        }}
                        className="w-full text-left px-2 py-2 rounded-lg text-sm hover:bg-slate-50"
                      >
                        {a.label || a.id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-2">
              <button
                onClick={close}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default function Users() {
  const apiBase = getApiBase();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [catalog, setCatalog] = useState([]);
  const [catalogErr, setCatalogErr] = useState("");
  const [registryUsers, setRegistryUsers] = useState([]);

  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [actionOpen, setActionOpen] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [actionDef, setActionDef] = useState(null);
  const [actionModalNonce, setActionModalNonce] = useState(0);

  async function loadCatalog() {
    if (!apiBase) return;
    try {
      setCatalogErr("");
      const d = await api.actionsCatalog();
      setCatalog(Array.isArray(d?.actions) ? d.actions : []);
    } catch (e) {
      setCatalogErr(e?.message || "Failed to load actions catalog");
    }
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIcon(key) {
    if (sortKey !== key) return <span className="text-slate-300">↕</span>;
    return sortDir === "asc" ? <span>▲</span> : <span>▼</span>;
  }

  async function loadUsers(nextPage = page) {
    setBusy(true);
    setErr("");

    if (!apiBase) {
      setErr("Local API Endpoint is not set. Please login first.");
      setBusy(false);
      return;
    }

    let statusParam = "all";
    let bannedParam = "all";

    if (status === "banned") {
      statusParam = "all";
      bannedParam = "true";
    } else if (status === "online") {
      statusParam = "online";
      bannedParam = "false";
    } else if (status === "offline") {
      statusParam = "offline";
      bannedParam = "false";
    } else {
      statusParam = "all";
      bannedParam = "all";
    }

    try {
      const params = {
        status: statusParam,
        banned: bannedParam,
        query: query.trim(),
        page: String(nextPage),
        limit: String(limit),
        sort: sortKey,
        order: sortDir,
      };

      const d = await api.users(params);
      setPage(d.page ?? nextPage);
      setTotal(d.total ?? 0);
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch (e) {
      setErr(e?.message || "Failed to load users");
      setItems([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (apiBase) {
      loadUsers(1);
      loadCatalog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  useEffect(() => {
    if (!apiBase) return;
    const t = setTimeout(() => loadUsers(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query, limit, sortKey, sortDir]);

  function openAction(user, actionId) {
    const def = catalog.find((a) => a.id === actionId);
    if (!def) {
      setCatalogErr(`Unknown action: ${actionId}`);
      return;
    }

    if (actionId === "teleport_to_player") {
      loadRegistryUsers();
    }
    setActionUser(user);
    setActionDef(def);
    setActionOpen(true);
    setActionModalNonce((n) => n + 1);
  }

  async function runAction(payload) {
    if (!actionUser || !actionDef) return;
    try {
      await api.execAction(actionUser.uuid, actionDef.id, payload);
      setActionOpen(false);
      setActionUser(null);
      setActionDef(null);
      loadUsers(page);
    } catch (e) {
      alert(e?.message || "Action failed");
    }
  }

  async function doBan(u) {
    const reason = window.prompt("Ban reason (optional)") || "";
    try {
      await api.ban(u.uuid, reason);
      loadUsers(page);
    } catch (e) {
      alert(e?.message || "Ban failed");
    }
  }

  async function doUnban(u) {
    try {
      await api.unban(u.uuid);
      loadUsers(page);
    } catch (e) {
      alert(e?.message || "Unban failed");
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  async function loadRegistryUsers() {
    try {
      const d = await api.users({
        status: "all",
        banned: "all",
        query: "",
        page: "1",
        limit: "200",
        sort: "name",
        order: "asc",
      });
      const list = Array.isArray(d.items) ? d.items : [];
      setRegistryUsers(list.map((u) => ({ uuid: u.uuid, name: u.name })));
    } catch {
      setRegistryUsers([]);
    }
  }

  const showing = items.length;
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = (page - 1) * limit + showing;

  const filteredByStatus = useMemo(() => {
    if (status === "banned") return items.filter((u) => !!u.banned);
    if (status === "online") return items.filter((u) => !u.banned && !!u.online);
    if (status === "offline") return items.filter((u) => !u.banned && !u.online);
    return items;
  }, [items, status]);

  const displayItems = useMemo(() => {
    const arr = [...filteredByStatus];

    const statusRank = (u) => {
      if (u.banned) return 2; // Banned
      if (u.online) return 1; // Online
      return 0;               // Offline
    };

    arr.sort((a, b) => {
      let cmp = 0;

      if (sortKey === "status") {
        cmp = statusRank(a) - statusRank(b);
        if (sortDir === "desc") cmp = -cmp;
      } else if (sortKey === "name") {
        cmp = compareAlphaNum(a.name, b.name, sortDir);
      } else if (sortKey === "uuid") {
        cmp = compareAlphaNum(a.uuid, b.uuid, sortDir);
      }

      if (cmp === 0) cmp = compareAlphaNum(a.name, b.name, "asc");
      if (cmp === 0) cmp = compareAlphaNum(a.uuid, b.uuid, "asc");

      return cmp;
    });

    return arr;
  }, [filteredByStatus, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Header / Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="font-semibold">Users</div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-64"
              placeholder="Search: name or uuid"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={busy}
            />

            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={busy}
              title="Online filter"
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="banned">Banned</option>
            </select>

            {/* ✅ 표시 개수 선택 */}
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={busy}
              title="Rows per page"
            >
              {[10, 25, 50, 75, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>

            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={() => loadUsers(1)}
              disabled={busy || !apiBase}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Total: <span className="font-semibold text-slate-700">{total}</span> · Showing:{" "}
          <span className="font-semibold text-slate-700">{fromN}-{toN}</span>
          {catalogErr && <span className="ml-2 text-amber-700">({catalogErr})</span>}
        </div>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 min-w-[110px]">
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    Status {sortIcon("status")}
                  </button>
                </th>
                <th className="text-left py-2 px-3 min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    Name {sortIcon("name")}
                  </button>
                </th>
                <th className="text-left py-2 px-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("uuid")}
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    UUID {sortIcon("uuid")}
                  </button>
                </th>
                <th className="text-center py-2 px-3 min-w-[160px]">World</th>
                <th className="text-center py-2 px-2 min-w-[72px]">X</th>
                <th className="text-center py-2 px-2 min-w-[72px]">Y</th>
                <th className="text-center py-2 px-2 min-w-[72px]">Z</th>
                <th className="text-center py-2 px-3 min-w-[140px]">Ban</th>
                <th className="text-left py-2 w-[110px]">Actions</th>
              </tr>
            </thead>

            <tbody className="text-slate-900">
              {displayItems.map((u) => {
                const online = !!u.online;

                const world = online ? (u.world || "-") : "-";
                const x = online ? Number(u.x ?? 0).toFixed(1) : "-";
                const y = online ? Number(u.y ?? 0).toFixed(1) : "-";
                const z = online ? Number(u.z ?? 0).toFixed(1) : "-";

                return (
                  <tr key={u.uuid} className="border-b border-slate-100 align-middle">
                    <td className="py-3 px-3">{badgeStatus(u)}</td>

                    <td className="py-3 font-semibold">{u.name || "-"}</td>

                    <td className="py-3 min-w-[360px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700">{u.uuid}</span>
                        <button
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => copyText(u.uuid)}
                        >
                          Copy
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-block truncate max-w-[220px]" title={world}>
                        {world}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-center tabular-nums">{x}</td>
                    <td className="py-3 px-2 text-center tabular-nums">{y}</td>
                    <td className="py-3 px-2 text-center tabular-nums">{z}</td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        {u.banned ? (
                          <button
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => doUnban(u)}
                            disabled={busy}
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => doBan(u)}
                            disabled={busy}
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3">
                      <ActionPicker
                        disabled={!online || !catalog.length || busy}
                        actions={catalog.filter((a) => a.id !== "ban")} // ban은 별도 버튼
                        onPick={(aid) => openAction(u, aid)}
                      />
                    </td>
                  </tr>
                );
              })}

              {!busy && items.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={9}>
                    {apiBase ? "No users" : "Login required"}
                  </td>
                </tr>
              )}

              {busy && (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={9}>
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => loadUsers(Math.max(1, page - 1))}
            disabled={busy || page <= 1}
          >
            Prev
          </button>
          <div className="text-sm text-slate-700">
            Page <span className="font-semibold">{page}</span>
          </div>
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => loadUsers(page + 1)}
            disabled={busy || page * limit >= total}
          >
            Next
          </button>
        </div>
      </div>

      {/* Action modal */}
      <ActionModal
        key={actionModalNonce}
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        onRun={runAction}
        user={actionUser}
        action={actionDef}
        registryUsers={registryUsers}
      />
    </div>
  );
}
