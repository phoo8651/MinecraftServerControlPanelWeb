const TOKEN_KEY = "mscp_token";
const API_BASE_KEY = "mscp_api_base";  // 추가


export const ALLOWED_API_BASES = new Set([
  "https://127.0.0.1:8443",
  "https://127.0.0.1:7443",
]);


export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getApiBase() {
  return sessionStorage.getItem(API_BASE_KEY) || "";
}
export function setApiBase(base) {
  if (!base) return sessionStorage.removeItem(API_BASE_KEY);
  const b = base.replace(/\/+$/, "");
  if (!ALLOWED_API_BASES.has(b)) {
    throw new Error("This is a not allowed Local API Endpoint.");
  }
  sessionStorage.setItem(API_BASE_KEY, b);
}

async function request(method, path, body) {
  const base = getApiBase();
  if (!base) throw new Error("The Local API Endpoint has not been set. Please log in again.");

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!json || json.ok !== true) {
    const msg = json?.error?.message || `API error (${res.status})`;
    throw new Error(msg);
  }
  return json.data;
}

export const api = {
  login: (password) => request("POST", "/api/auth/login", { password }),
  logout: () => request("POST", "/api/auth/logout", {}),
  status: () => request("GET", "/api/status"),
  metrics: (from, to, step) => request("GET", `/api/metrics?from=${from}&to=${to}&step=${step}`),
  gamerules: () => request("GET", "/api/gamerules"),
  patchGamerules: (changes) => request("PATCH", "/api/gamerules", { changes }),
  users: (params) => {
    const qs = new URLSearchParams(params);
    return request("GET", `/api/users?${qs.toString()}`);
  },
  ban: (uuid, reason) => request("POST", `/api/users/${uuid}/ban`, { reason }),
  unban: (uuid) => request("DELETE", `/api/users/${uuid}/ban`),
  actionsCatalog: () => request("GET", "/api/actions/catalog"),
  execAction: (uuid, actionId, payload) => request("POST", `/api/users/${uuid}/actions/${actionId}`, payload),
  broadcastSchedules: () => request("GET", "/api/broadcast/schedules"),
  broadcastSend: (message) => request("POST", "/api/broadcast/send", { message }),
  broadcastSchedulesList: () => request("GET", "/api/broadcast/schedules"),
  broadcastSchedulesCreate: (payload) => request("POST", "/api/broadcast/schedules", payload),
  broadcastSchedulesUpdate: (id, payload) => request("PUT", `/api/broadcast/schedules/${id}`, payload),
  broadcastSchedulesDelete: (id) => request("DELETE", `/api/broadcast/schedules/${id}`),
  consoleCommand: (command) => request("POST", "/api/console/command", { command }),
  playerLogs: (params) => {
    const qs = new URLSearchParams(params);
    return request("GET", `/api/logs/player?${qs.toString()}`);
  },
  serverLogs: (params) => {
    const qs = new URLSearchParams(params);
    return request("GET", `/api/logs/server?${qs.toString()}`);
  },
};
