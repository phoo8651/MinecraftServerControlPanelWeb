import React, { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api, getToken, setToken, setApiBase } from "../lib/api.js";
import LoginModal from "./LoginModal.jsx";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

const NAV_ITEMS = [
  ["Dashboard", "/dashboard"],
  ["Rules", "/rules"],
  ["Users", "/users"],
  ["Broadcast", "/broadcast"],
  ["Console", "/console"],
  ["Logs", "/logs"],
];

export default function Layout({ children }) {
  const [authed, setAuthed] = useState(!!getToken());
  const [loginOpen, setLoginOpen] = useState(!getToken());
  const nav = useNavigate();

  const year = useMemo(() => new Date().getFullYear(), []);

  async function onLogin(apiBase, password) {
    setApiBase(apiBase); // allowlist 검증 포함
    const data = await api.login(password);
    setToken(data.token);
    setAuthed(true);
    setLoginOpen(false);
  }

  async function onLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setToken("");
    setAuthed(false);
    setLoginOpen(true);
    nav("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-300/15 border border-indigo-500/20 flex items-center justify-center font-black">
              <img src="/favicon.png" alt="Logo" className="w-8 h-8" />
            </div>
            <div className="hidden sm:block">
              <div className="font-semibold leading-5">Minecraft Server Control Panel</div>
              <div className="text-xs text-slate-500 leading-4">mscp.torugi.com</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-x-auto">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 min-w-max">
                {NAV_ITEMS.map(([label, href]) => (
                  <NavLink
                    key={href}
                    to={href}
                    className={({ isActive }) =>
                      cx(
                        "px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition",
                        isActive
                          ? "bg-slate-100 border-slate-200"
                          : "border-transparent hover:bg-slate-100"
                      )
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!authed ? (
              <button
                onClick={() => setLoginOpen(true)}
                className="px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Login
              </button>
            ) : (
              <button
                onClick={onLogout}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-100"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-4 flex-1">
        {children}
      </main>

      <footer className="border-t border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Minecraft Server Control Panel © {year} <a href="mailto:torugi@torugi.com" target="_blank">Luneira Torugi</a> All right reserved.
          </div>
          <div className="sm:ml-auto text-xs text-slate-400 dark:text-slate-500">
            <a href="https://chzzk.naver.com/273ff1afdeeb38b06043f6a908a3543f" target="_blank">Chzzk</a> | <a href="https://github.com/phoo8651">GitHub</a> | <a href="https://x.com/LuneiraTorugi" target="_blank">X</a>
          </div>
        </div>
      </footer>

      <LoginModal
        open={loginOpen}
        onClose={() => (authed ? setLoginOpen(false) : null)}
        onLogin={onLogin}
      />
    </div>
  );
}
