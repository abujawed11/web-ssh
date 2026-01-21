import { Server, LogOut, Clock, Shield } from "lucide-react";

export default function ConnectedCard({ connection, onDisconnect }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Server className="w-32 h-32" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Active Session</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-6 truncate" title={connection.host}>
          {connection.host}
        </h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-700">
              <Server className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Port</span>
              <span className="text-sm text-slate-200 font-mono">{connection.port}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
             <div className="p-2 bg-slate-900 rounded-lg border border-slate-700">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Auth Method</span>
              <span className="text-sm text-slate-200 capitalize">{connection.authType}</span>
            </div>
          </div>
          
           <div className="flex items-center gap-3 text-slate-400">
             <div className="p-2 bg-slate-900 rounded-lg border border-slate-700">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session ID</span>
              <span className="text-xs text-slate-200 font-mono truncate w-32" title={connection.sessionId}>
                {connection.sessionId.split('-')[0]}...
              </span>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onDisconnect}
        className="mt-6 w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        Disconnect Session
      </button>
    </div>
  );
}
