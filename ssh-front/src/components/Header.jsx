import { Terminal, LogOut } from "lucide-react";

export default function Header({ user, onLogout }) {
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
