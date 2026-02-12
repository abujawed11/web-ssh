import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, RefreshCcw, Edit3, CheckCircle } from "lucide-react";
import SessionModal from "./SessionModal";

export default function TargetHubModal({ open, onClose, tabs, initialTabKey }) {
  const [activeKey, setActiveKey] = useState(initialTabKey || tabs?.[0]?.key);
  const [search, setSearch] = useState("");
  const [textInput, setTextInput] = useState("");

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

  const handleTextInputSubmit = () => {
    const value = textInput.trim();
    if (!value) return;

    // Validate pattern if provided
    if (active?.pattern) {
      const regex = new RegExp(active.pattern);
      if (!regex.test(value)) {
        alert(`Invalid format for ${active.label}. ${active.patternHint || ''}`);
        return;
      }
    }

    active.onSelect?.(value);
    setTextInput("");
    onClose?.();
  };

  const handleTabChange = (tab) => {
    setActiveKey(tab.key);
    setSearch("");
    setTextInput("");
    tab.onEnsure?.();
  };

  return (
    <SessionModal open={open} onClose={onClose} title="Pick targets">
      <div className="flex flex-col gap-3 h-[70vh] min-h-0">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {(tabs || []).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t)}
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
          <>
            {/* Text Input Mode */}
            {active.isTextInput ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder-slate-500"
                      placeholder={active.placeholder || `Enter ${active.label.toLowerCase()}`}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTextInputSubmit();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTextInputSubmit}
                    disabled={!textInput.trim()}
                    className="px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Set
                  </button>
                </div>

                {active.patternHint && (
                  <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                    <strong>Format:</strong> {active.patternHint}
                  </div>
                )}

                {/* Predefined Options */}
                {active.items && active.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
                      Or select from common values:
                    </div>
                    <div className="space-y-1 max-h-[calc(70vh-200px)] overflow-y-auto scrollbar-thin">
                      {active.items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (typeof item === 'string') {
                              active.onSelect?.(item);
                            } else {
                              active.onSelect?.(item.name || item.value);
                            }
                            onClose?.();
                          }}
                          className="w-full text-left p-3 rounded-lg border border-slate-700 hover:bg-slate-800 bg-slate-900/50 transition-colors"
                        >
                          <div className="text-sm text-slate-200 font-medium">
                            {typeof item === 'string' ? item : (item.name || item.value)}
                          </div>
                          {typeof item === 'object' && item.desc && (
                            <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* List Mode (existing functionality) */
              <>
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
              </>
            )}
          </>
        )}
      </div>
    </SessionModal>
  );
}
