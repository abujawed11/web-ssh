import { useMemo, useState } from "react";
import { Search, RefreshCcw, CheckCircle, AlertTriangle, Circle } from "lucide-react";
import SessionModal from "./SessionModal";

function statusBadge(entry) {
  const state = String(entry.state || "").toLowerCase();
  const status = String(entry.status || "").toLowerCase();

  if (state === "active" && (status === "running" || status === "exited")) {
    return { label: "running", icon: CheckCircle, cls: "text-emerald-400" };
  }
  if (state === "failed" || status === "failed") {
    return { label: "failed", icon: AlertTriangle, cls: "text-red-400" };
  }
  return { label: state || status || "unknown", icon: Circle, cls: "text-slate-500" };
}

export default function ServicePickerModal({
  open,
  onClose,
  services,
  loading,
  onRefresh,
  onSelect,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(services) ? services : [];
    if (!q) return list;
    return list.filter((s) => {
      const hay = `${s.name} ${s.rawUnit} ${s.state} ${s.status} ${s.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [services, search]);

  return (
    <SessionModal open={open} onClose={onClose} title="Pick a systemd service">
      <div className="flex flex-col gap-3 h-[70vh] min-h-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-sm flex items-center gap-2"
            title="Refresh"
          >
            <RefreshCcw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin rounded-lg border border-slate-800 bg-slate-950/30">
          {loading ? (
            <div className="p-4 text-sm text-slate-400">Loading services…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">No services found.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filtered.map((s) => {
                const b = statusBadge(s);
                const Icon = b.icon;
                return (
                  <button
                    key={s.rawUnit || s.name}
                    type="button"
                    onClick={() => {
                      onSelect?.(s.name);
                      onClose?.();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-900/50 transition-colors flex items-start justify-between gap-3"
                    title={s.rawUnit}
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 font-semibold truncate">{s.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{s.description || s.rawUnit}</div>
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 shrink-0 ${b.cls}`}>
                      <Icon className="w-4 h-4" />
                      {b.label}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SessionModal>
  );
}

