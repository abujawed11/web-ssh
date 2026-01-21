import { X, Server, ChevronDown } from "lucide-react";

export default function TargetSelector({
  connected,
  targetType,
  onTargetTypeChange,
  selectedService,
  onClearService,
  onPickService,
}) {
  return (
    <div className="bg-slate-900/30 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target</div>

        <div className="relative">
          <select
            value={targetType}
            onChange={(e) => onTargetTypeChange?.(e.target.value)}
            disabled={!connected}
            className="appearance-none bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="service">Service (systemd)</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {selectedService ? (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-full px-3 py-1.5 min-w-0">
            <Server className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-sm text-slate-200 truncate" title={selectedService}>
              {selectedService}
            </div>
            <button
              type="button"
              onClick={onClearService}
              className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200"
              title="Clear target"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No target selected</div>
        )}
      </div>

      <button
        type="button"
        onClick={onPickService}
        disabled={!connected}
        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
        title={connected ? "Pick a service" : "Connect first"}
      >
        Pick service
      </button>
    </div>
  );
}

