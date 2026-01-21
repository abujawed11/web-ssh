import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, Play, Copy, TerminalSquare } from "lucide-react";

export default function TaskWindow({
  group,
  connected,
  onSelectCommand,
  onRunCommand,
}) {
  const [search, setSearch] = useState("");

  const tasks = useMemo(() => {
    const list = group?.tasks || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      const hay = `${t.title} ${(t.tags || []).join(" ")} ${t.command}`.toLowerCase();
      return hay.includes(q);
    });
  }, [group, search]);

  const title = group?.title || "Tasks";
  const desc = group?.description || "Select a task group to see commands.";

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-blue-400" />
              {title}
            </h3>
            {/* <div className="text-xs text-slate-500 mt-1 truncate">{desc}</div> */}
          </div>
          <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 shrink-0">
            {tasks.length} commands
          </div>
          
        </div>

        {/* <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
            placeholder="Search commands in this group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div> */}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1 scrollbar-thin">
        {!group ? (
          <div className="p-4 text-sm text-slate-400">Pick a group from the right to view commands.</div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No commands match your search.</div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-lg border border-slate-700/60 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 text-sm truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1 truncate" title={t.command}>
                    {t.command}
                  </div>
                  {/* <div className="flex gap-1 flex-wrap mt-2">
                    {(t.tags || []).slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div> */}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectCommand(t.command)}
                    className="p-2 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-slate-200"
                    title="Load into editor"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunCommand?.(t.command)}
                    disabled={!connected}
                    className={clsx(
                      "px-3 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors",
                      connected
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    )}
                    title={connected ? "Run now" : "Connect to run"}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    RUN
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

