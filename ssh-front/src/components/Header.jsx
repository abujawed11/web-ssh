import { Terminal, LogOut, Server } from "lucide-react";

export default function Header({ user, onLogout, session, cwd, onSessionClick }) {
  const connected = !!session?.sessionId;
  const label = connected
    ? `${session.username || "user"}@${session.hostName || session.host}`
    : "Connect";
  const sub = connected ? (cwd || "/") : "No active session";

  return (
    <header className="bg-slate-800 border-b border-slate-700 py-3 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Terminal className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 leading-none">Web SSH</h1>
          <span className="text-xs text-slate-400">Secure Browser Terminal</span>
        </div>
      </div>
      
      {user && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onSessionClick}
            className="hidden md:flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 transition-colors"
            title={connected ? "Session info" : "Connect"}
          >
            <span
              className={
                "w-2 h-2 rounded-full " +
                (connected ? "bg-emerald-500" : "bg-slate-500")
              }
            />
            <div className="flex flex-col items-start leading-none max-w-[280px]">
              <div className="text-sm font-semibold text-slate-200 truncate flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                {label}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{sub}</div>
            </div>
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-200">{user.email}</div>
            <div className="text-xs text-slate-500">Authenticated</div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-red-400"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
}
