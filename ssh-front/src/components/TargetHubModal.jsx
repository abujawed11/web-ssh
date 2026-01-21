import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, RefreshCcw } from "lucide-react";
import SessionModal from "./SessionModal";

export default function TargetHubModal({ open, onClose, tabs, initialTabKey }) {
  const [activeKey, setActiveKey] = useState(initialTabKey || tabs?.[0]?.key);
  const [search, setSearch] = useState("");

  const active = useMemo(() => {
    const list = Array.isArray(tabs) ? tabs : [];
    return list.find((t) => t.key === activeKey) || list[0] || null;
  }, [activeKey, tabs]);

  const items = useMemo(() => {
    const list = Array.isArray(active?.items) ? active.items : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => (active?.filterText?.(it) || "").toLowerCase().includes(q));
  }, [active, search]);

  return (
    <SessionModal open={open} onClose={onClose} title="Pick targets">
      <div className="flex flex-col gap-3 h-[70vh] min-h-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {(tabs || []).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveKey(t.key);
                setSearch("");
                t.onEnsure?.();
              }}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors",
                t.key === activeKey
                  ? "bg-slate-700/60 border-slate-500 text-slate-200"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
                placeholder={`Search ${active.label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => active.onRefresh?.()}
              disabled={active.loading}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-sm flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className={active.loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
              Refresh
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin rounded-lg border border-slate-800 bg-slate-950/30">
          {!active ? (
            <div className="p-4 text-sm text-slate-400">No targets available.</div>
          ) : active.loading ? (
            <div className="p-4 text-sm text-slate-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">No results.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {items.map((it, idx) => (
                <button
                  key={active.keyFor?.(it) || idx}
                  type="button"
                  onClick={() => {
                    active.onSelect?.(it);
                    onClose?.();
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-900/50 transition-colors"
                  title={active.filterText?.(it)}
                >
                  {active.renderRow?.(it) || (
                    <div className="text-sm text-slate-200">{String(active.filterText?.(it) || "")}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </SessionModal>
  );
}
