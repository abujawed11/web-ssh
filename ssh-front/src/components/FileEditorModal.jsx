import SessionModal from "./SessionModal";

export default function FileEditorModal({
  open,
  path,
  content,
  onChange,
  onClose,
  onSave,
  saving,
  loading,
}) {
  return (
    <SessionModal open={open} onClose={onClose} title={path ? `Edit: ${path}` : "Edit file"}>
      <div className="flex flex-col gap-3 h-[70vh] min-h-0">
        {loading ? (
          <div className="flex-1 min-h-0 w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-400">
            Loading file…
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onChange?.(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-0 w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm font-mono text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(content)}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </SessionModal>
  );
}
