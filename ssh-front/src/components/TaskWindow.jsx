import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, Play, Copy, TerminalSquare, Server, X } from "lucide-react";
import TargetSelector from "./TargetSelector";
import ServicePickerModal from "./ServicePickerModal";

function renderTemplate(template, vars) {
  const str = String(template || "");
  return str.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    const val = vars?.[key];
    return val == null ? "" : String(val);
  });
}

function missingRequires(task, vars) {
  const req = Array.isArray(task.requires) ? task.requires : [];
  return req.filter((k) => !vars?.[k]);
}

function loadTargets(sessionId) {
  if (!sessionId) return {};
  try {
    const raw = localStorage.getItem(`webssh:target:${sessionId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTargets(sessionId, next) {
  if (!sessionId) return;
  localStorage.setItem(`webssh:target:${sessionId}`, JSON.stringify(next || {}));
}

export default function TaskWindow({
  sessionId,
  group,
  connected,
  onSelectCommand,
  onRunCommand,
  services,
  servicesLoading,
  onFetchServices,
}) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [targetType, setTargetType] = useState("service");
  const [targetOpen, setTargetOpen] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [targets, setTargets] = useState(() => loadTargets(sessionId));

  const vars = useMemo(() => ({ service: targets.service }), [targets.service]);

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
  const isServiceControl = group?.id === "service-control";
  const needsService = useMemo(
    () => (group?.tasks || []).some((t) => (t.requires || []).includes("service")),
    [group]
  );

  const setService = (name) => {
    const next = { ...targets, service: name };
    setTargets(next);
    saveTargets(sessionId, next);
  };

  const clearService = () => {
    const next = { ...targets };
    delete next.service;
    setTargets(next);
    saveTargets(sessionId, next);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-blue-400" />
              {title}
            </h3>
            <div className="text-xs text-slate-500 mt-1 truncate">{desc}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {needsService && !targetOpen && (
              <div className="hidden md:flex items-center gap-2">
                {targets.service ? (
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-full px-3 py-1.5 max-w-[240px]">
                    <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-xs text-slate-200 truncate" title={targets.service}>
                      {targets.service}
                    </div>
                    <button
                      type="button"
                      onClick={clearService}
                      className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200"
                      title="Clear service"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!connected) return;
                      onFetchServices?.();
                      setServicePickerOpen(true);
                    }}
                    disabled={!connected}
                    className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-sm"
                    title={connected ? "Pick a service" : "Connect first"}
                  >
                    Pick service
                  </button>
                )}
              </div>
            )}

            {needsService && (
              <button
                type="button"
                onClick={() => setTargetOpen((v) => !v)}
                disabled={!connected}
                className={clsx(
                  "p-2 rounded-lg border transition-colors",
                  targetOpen
                    ? "bg-slate-700/60 border-slate-500 text-slate-200"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800",
                  !connected && "opacity-50 cursor-not-allowed"
                )}
                title={targetOpen ? "Hide target" : "Target"}
              >
                <Server className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className={clsx(
                "p-2 rounded-lg border transition-colors",
                searchOpen
                  ? "bg-slate-700/60 border-slate-500 text-slate-200"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
              title={searchOpen ? "Hide search" : "Search commands"}
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              {tasks.length} commands
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
              placeholder="Search commands in this group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {needsService && targetOpen && (
          <div className="mt-3">
            <TargetSelector
              connected={connected}
              targetType={targetType}
              onTargetTypeChange={setTargetType}
              selectedService={targets.service}
              onClearService={clearService}
              onPickService={() => {
                if (!connected) return;
                onFetchServices?.();
                setServicePickerOpen(true);
              }}
            />

            {isServiceControl && targets.service && (
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                Preview:
                <span className="text-slate-300 font-mono truncate">
                  {renderTemplate("sudo systemctl status {{service}} --no-pager", vars)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1 scrollbar-thin">
        {!group ? (
          <div className="p-4 text-sm text-slate-400">Pick a group from the right to view commands.</div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No commands match your search.</div>
        ) : (
          tasks.map((t) => {
            const missing = missingRequires(t, vars);
            const disabled = !connected || missing.length > 0;
            const tooltip = !connected
              ? "Connect to run"
              : missing.length
                ? "Select a service first"
                : "";
            const rendered = renderTemplate(t.command, vars);

            return (
              <div
                key={t.id}
                className="p-3 rounded-lg border border-slate-700/60 bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 text-sm truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1 truncate" title={rendered}>
                      {rendered}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectCommand(rendered)}
                      disabled={disabled}
                      className="p-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors text-slate-400 hover:text-slate-200"
                      title={disabled ? tooltip : "Load into editor"}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRunCommand?.(rendered)}
                      disabled={disabled}
                      className={clsx(
                        "px-3 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors",
                        !disabled
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed"
                      )}
                      title={disabled ? tooltip : (t.longRunning ? "Run (stream)" : "Run now")}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      RUN
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ServicePickerModal
        open={servicePickerOpen}
        onClose={() => setServicePickerOpen(false)}
        services={services}
        loading={servicesLoading}
        onRefresh={onFetchServices}
        onSelect={(name) => setService(name)}
      />
    </div>
  );
}

