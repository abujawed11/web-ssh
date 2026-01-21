import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import {
  Folder,
  FileText,
  Search,
  ChevronRight,
  ArrowUp,
  RefreshCcw,
  FolderPlus,
  FilePlus,
  Copy,
  Scissors,
  ClipboardPaste,
  Pencil,
  Trash2,
  TextCursorInput,
} from "lucide-react";
import FileEditorModal from "./FileEditorModal";
import SessionModal from "./SessionModal";

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

function clampMenuPosition(anchorX, anchorY, menuRect, padding = 8) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = menuRect?.width || 240;
  const h = menuRect?.height || 220;

  let x = anchorX;
  let y = anchorY;

  if (x + w + padding > vw) x = vw - w - padding;
  if (y + h + padding > vh) y = vh - h - padding;

  x = Math.max(padding, x);
  y = Math.max(padding, y);

  return { x, y };
}

export default function FileExplorer({
  connected,
  cwd,
  dirPath,
  entries,
  loading,
  onSetCwd,
  onRefresh,
  onMkdir,
  onCreateFile,
  onRename,
  onDelete,
  onCopyPath,
  onMovePath,
  onReadFile,
  onWriteFile,
}) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(null); // { x, y, anchorX, anchorY, placed, target }
  const [clipboard, setClipboard] = useState(null); // { mode:'copy'|'cut', item:{name,type,path} }
  const [actionOpen, setActionOpen] = useState(false);
  const [actionKind, setActionKind] = useState(null); // new_dir | new_file | rename
  const [actionValue, setActionValue] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
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

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(entries) ? entries : [];
    if (!q) return list;
    return list.filter((e) => String(e.name || "").toLowerCase().includes(q));
  }, [entries, search]);

  const openPrompt = (kind, initial) => {
    setActionKind(kind);
    setActionValue(initial || "");
    setActionOpen(true);
  };

  const closePrompt = () => {
    setActionOpen(false);
    setActionKind(null);
    setActionValue("");
  };

  const validateName = (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    if (trimmed.includes("/") || trimmed.includes("\\")) return null;
    if (trimmed === "." || trimmed === "..") return null;
    return trimmed;
  };

  const doCreate = async () => {
    const name = validateName(actionValue);
    if (!name) {
      toast.error("Invalid name");
      return;
    }

    const target = joinPath(currentPath, name);
    setActionBusy(true);
    try {
      if (actionKind === "new_dir") await onMkdir?.(target);
      if (actionKind === "new_file") await onCreateFile?.(target);
      closePrompt();
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Operation failed");
    } finally {
      setActionBusy(false);
    }
  };

  const doRename = async () => {
    if (!selected) return;
    const name = validateName(actionValue);
    if (!name) {
      toast.error("Invalid name");
      return;
    }

    const parent = parentPath(selected.path);
    const to = joinPath(parent, name);

    setActionBusy(true);
    try {
      await onRename?.(selected.path, to);
      closePrompt();
      setSelected(null);
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Rename failed");
    } finally {
      setActionBusy(false);
    }
  };

  const doDelete = async (target = selected) => {
    if (!target) return;
    const ok = confirm(`Delete ${target.type === "dir" ? "folder" : "file"}: ${target.name}?`);
    if (!ok) return;

    setActionBusy(true);
    try {
      await onDelete?.(target.path);
      if (selected?.path === target.path) setSelected(null);
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setActionBusy(false);
    }
  };

  const openEditor = async (path) => {
    if (!path) return;
    setEditorOpen(true);
    setEditorPath(path);
    setEditorContent("");
    setEditorLoading(true);
    try {
      const res = await onReadFile?.(path);
      setEditorContent(res?.content ?? "");
    } catch (e) {
      toast.error(e?.message || "Failed to open file");
      setEditorOpen(false);
      setEditorLoading(false);
      return;
    } finally {
      setEditorLoading(false);
    }
  };

  const saveEditor = async (content) => {
    setEditorSaving(true);
    try {
      await onWriteFile?.(editorPath, content);
      toast.success("Saved");
      setEditorOpen(false);
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setEditorSaving(false);
    }
  };

  useEffect(() => {
    if (!menu) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenu(null);
    };

    const onAnyClose = () => setMenu(null);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onAnyClose);
    window.addEventListener("scroll", onAnyClose, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onAnyClose);
      window.removeEventListener("scroll", onAnyClose, true);
    };
  }, [menu]);

  const openContextMenu = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    if (!connected) return;

    if (target) setSelected(target);
    const padding = 8;
    const approxWidth = 240;
    const approxHeight = target ? 320 : 140;
    const x = Math.min(e.clientX, window.innerWidth - approxWidth - padding);
    const y = Math.min(e.clientY, window.innerHeight - approxHeight - padding);
    setMenu({ x, y, anchorX: e.clientX, anchorY: e.clientY, placed: false, target: target || null });
  };

  const ctxTarget = menu?.target || null;
  const ctxIsFile = ctxTarget?.type === "file";
  const ctxIsDir = ctxTarget?.type === "dir";
  const ctxPasteDir = ctxIsDir ? ctxTarget.path : currentPath;

  const setClipboardMode = (mode, item) => {
    setClipboard({ mode, item });
    toast.success(mode === "cut" ? "Cut to clipboard" : "Copied to clipboard");
  };

  const pasteClipboard = async (destDir) => {
    if (!clipboard?.item) return;
    if (!destDir) return;

    setActionBusy(true);
    try {
      if (clipboard.mode === "cut") {
        await onMovePath?.(clipboard.item.path, destDir);
        setClipboard(null);
      } else {
        await onCopyPath?.(clipboard.item.path, destDir);
      }
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Paste failed");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
        <div className="font-semibold text-slate-200 flex items-center gap-2">
          <Folder className="w-4 h-4 text-emerald-400" />
          File Explorer
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => connected && openPrompt("new_dir")}
            disabled={!connected || loading || actionBusy}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => connected && openPrompt("new_file")}
            disabled={!connected || loading || actionBusy}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            title="New file"
          >
            <FilePlus className="w-4 h-4" />
          </button>

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

      <div className="px-4 py-3 border-b border-slate-700/60 bg-slate-900/20 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200 placeholder-slate-500"
            placeholder="Search in this folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!connected}
          />
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-300 overflow-x-auto whitespace-nowrap scrollbar-thin">
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

      <div
        className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-thin"
        onContextMenu={(e) => openContextMenu(e, null)}
        onClick={() => setMenu(null)}
      >
        {!connected ? (
          <div className="p-4 text-sm text-slate-400">
            Connect to browse files.
          </div>
        ) : loading ? (
          <div className="p-4 text-sm text-slate-400">Loading directory...</div>
        ) : filteredEntries?.length ? (
          <div className="space-y-1">
            {filteredEntries.map((e) => {
              const isDir = e.type === "dir";
              const path = joinPath(currentPath, e.name);
              const isSelected = selected?.path === path;
              const target = { name: e.name, type: e.type, path };
              return (
                <button
                  key={`${e.name}:${e.type}`}
                  type="button"
                  onClick={() => setSelected(target)}
                  onContextMenu={(ev) => openContextMenu(ev, target)}
                  onDoubleClick={() => {
                    if (isDir) onSetCwd(path);
                    else if (e.type === "file") openEditor(path);
                  }}
                  disabled={false}
                  className={
                    "w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg border " +
                    (isSelected
                      ? "bg-slate-700/50 border-slate-500"
                      : "border-transparent hover:bg-slate-700/30 hover:border-slate-600")
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
          <div className="p-4 text-sm text-slate-400">{search.trim() ? "No matches." : "Empty directory."}</div>
        )}
      </div>

      {menu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={(node) => {
              if (!node || !menu || menu.placed) return;
              const rect = node.getBoundingClientRect();
              const pos = clampMenuPosition(menu.anchorX ?? menu.x, menu.anchorY ?? menu.y, rect, 8);
              setMenu((m) => (m ? { ...m, ...pos, placed: true } : m));
            }}
            className="fixed z-[1000] w-[240px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
            style={{ left: menu.x, top: menu.y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="p-2 border-b border-slate-700 bg-slate-800/40">
              <div className="text-xs text-slate-300 truncate" title={ctxTarget?.path || currentPath}>
                {ctxTarget?.name || currentPath}
              </div>
              {ctxTarget?.path && <div className="text-[10px] text-slate-500 truncate">{ctxTarget.path}</div>}
            </div>

            <div className="p-1">
              {ctxTarget ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      if (ctxIsDir) onSetCwd(ctxTarget.path);
                      else if (ctxIsFile) openEditor(ctxTarget.path);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm text-slate-200 flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4 text-slate-400" />
                    {ctxIsDir ? "Open" : "Open editor"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      setClipboardMode("copy", ctxTarget);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm text-slate-200 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                    Copy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      setClipboardMode("cut", ctxTarget);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm text-slate-200 flex items-center gap-2"
                  >
                    <Scissors className="w-4 h-4 text-slate-400" />
                    Cut
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      openPrompt("rename", ctxTarget.name);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm text-slate-200 flex items-center gap-2"
                  >
                    <TextCursorInput className="w-4 h-4 text-slate-400" />
                    Rename
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      pasteClipboard(ctxPasteDir);
                    }}
                    disabled={!clipboard || actionBusy}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-200 flex items-center gap-2"
                  >
                    <ClipboardPaste className="w-4 h-4 text-slate-400" />
                    Paste
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      doDelete(ctxTarget);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    pasteClipboard(currentPath);
                  }}
                  disabled={!clipboard || actionBusy}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-200 flex items-center gap-2"
                >
                  <ClipboardPaste className="w-4 h-4 text-slate-400" />
                  Paste
                </button>
              )}
            </div>
          </div>,
          document.body
        )}

      <SessionModal
        open={actionOpen}
        onClose={() => !actionBusy && closePrompt()}
        title={
          actionKind === "new_dir"
            ? "Create folder"
            : actionKind === "new_file"
              ? "Create file"
              : "Rename"
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            {actionKind === "rename" ? "New name" : "Name"}
          </div>
          <input
            value={actionValue}
            onChange={(e) => setActionValue(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200"
            placeholder={actionKind === "new_dir" ? "folder-name" : "file-name.txt"}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closePrompt}
              disabled={actionBusy}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={actionKind === "rename" ? doRename : doCreate}
              disabled={actionBusy}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
            >
              {actionBusy ? "Working..." : "Confirm"}
            </button>
          </div>
        </div>
      </SessionModal>

      <FileEditorModal
        open={editorOpen}
        path={editorPath}
        content={editorContent}
        onChange={setEditorContent}
        loading={editorLoading}
        saving={editorSaving}
        onClose={() => !editorSaving && setEditorOpen(false)}
        onSave={saveEditor}
      />
    </div>
  );
}
