import { X } from "lucide-react";

export default function SessionModal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close session modal"
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-800/60">
            <div className="text-sm font-semibold text-slate-200">{title || "Session"}</div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-slate-200"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-auto min-h-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

