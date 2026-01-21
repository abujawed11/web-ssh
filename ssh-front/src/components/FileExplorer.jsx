import { useMemo } from "react";
import { Folder, FileText, ChevronRight, ArrowUp, RefreshCcw } from "lucide-react";

function joinPath(base, name) {
  if (!base || base === "/") return `/${name}`;
  return `${base.replace(/\/+$/g, "")}/${name}`;
}

function parentPath(path) {
  if (!path || path === "/") return "/";
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join("/")}` : "/";
}

export default function FileExplorer({
  connected,
  cwd,
  dirPath,
  entries,
  loading,
  onSetCwd,
  onRefresh,
}) {
  const breadcrumb = useMemo(() => {
    const path = (cwd || "/").replace(/\\/g, "/");
    const segments = path.split("/").filter(Boolean);
    const crumbs = [{ label: "/", path: "/" }];
    for (let i = 0; i < segments.length; i++) {
      const p = `/${segments.slice(0, i + 1).join("/")}`;
      crumbs.push({ label: segments[i], path: p });
    }
    return crumbs;
  }, [cwd]);

  const currentPath = dirPath || cwd || "/";
  const canGoUp = connected && currentPath !== "/";

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
        <div className="font-semibold text-slate-200 flex items-center gap-2">
          <Folder className="w-4 h-4 text-emerald-400" />
          File Explorer
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 max-w-[220px] truncate"
            title={cwd || "/"}
          >
            {cwd || "/"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={!connected || loading}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCcw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </button>
          <button
            type="button"
            onClick={() => onSetCwd(parentPath(currentPath))}
            disabled={!canGoUp || loading}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            title="Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-700/60 bg-slate-900/20">
        <div className="flex items-center flex-wrap gap-1 text-xs text-slate-300">
          {breadcrumb.map((c, idx) => (
            <div key={c.path} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => connected && onSetCwd(c.path)}
                disabled={!connected || loading}
                className="hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={c.path}
              >
                {c.label}
              </button>
              {idx !== breadcrumb.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-thin">
        {!connected ? (
          <div className="p-4 text-sm text-slate-400">
            Connect to browse files.
          </div>
        ) : loading ? (
          <div className="p-4 text-sm text-slate-400">Loading directory…</div>
        ) : entries?.length ? (
          <div className="space-y-1">
            {entries.map((e) => {
              const isDir = e.type === "dir";
              return (
                <button
                  key={`${e.name}:${e.type}`}
                  type="button"
                  onClick={() => isDir && onSetCwd(joinPath(currentPath, e.name))}
                  disabled={!isDir}
                  className={
                    "w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-transparent " +
                    (isDir
                      ? "hover:bg-slate-700/50 hover:border-slate-600 cursor-pointer"
                      : "opacity-70 cursor-default")
                  }
                  title={e.name}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isDir ? (
                      <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="text-sm text-slate-200 truncate">{e.name}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 shrink-0">
                    {isDir ? "DIR" : "FILE"}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-400">Empty directory.</div>
        )}
      </div>
    </div>
  );
}
