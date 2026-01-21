import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, Layers } from "lucide-react";
import { TASK_GROUPS } from "../tasks/taskLibrary";

export default function TaskPanel({ activeGroupId, onSelectGroup }) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TASK_GROUPS;
    return TASK_GROUPS.filter((g) => {
      const hay = `${g.title} ${g.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-purple-400" />
          Task Groups
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-200 placeholder-slate-500"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1 scrollbar-thin">
        {filteredGroups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelectGroup(g.id)}
            className={clsx(
              "w-full text-left p-3 rounded-lg group transition-colors border",
              g.id === activeGroupId
                ? "bg-slate-700/60 border-slate-500"
                : "bg-transparent hover:bg-slate-700/40 border-transparent hover:border-slate-600"
            )}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-medium text-slate-200 text-sm truncate">{g.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{g.description}</div>
              </div>
              <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 shrink-0">
                {g.tasks.length}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
