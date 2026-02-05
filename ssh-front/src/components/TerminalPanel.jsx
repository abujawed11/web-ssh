import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Terminal, Square } from "lucide-react";
import XtermTerminal from "./XtermTerminal";

function stripAnsi(input) {
  const str = String(input ?? "");
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function colorizePrompt(prompt) {
  const str = String(prompt || "").trim();
  if (!str) return "$ ";

  const at = str.indexOf("@");
  const colon = str.indexOf(":", at >= 0 ? at + 1 : 0);
  if (at > 0 && colon > at + 1) {
    const user = str.slice(0, at);
    const host = str.slice(at + 1, colon);
    const path = str.slice(colon + 1) || "/";
    return `\x1b[32m${user}\x1b[0m@\x1b[36m${host}\x1b[0m:\x1b[34m${path}\x1b[0m $ `;
  }

  return `\x1b[36m${str}\x1b[0m $ `;
}

function normalizePosixAbsolutePath(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "/";
  const standardized = raw.replace(/\\/g, "/");
  const parts = standardized.split("/");
  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return `/${stack.join("/")}`;
}

function resolveCdTarget(currentCwd, arg, username) {
  const cwd = normalizePosixAbsolutePath(currentCwd || "/");
  const u = String(username || "").trim();
  const home = u && u !== "root" ? `/home/${u}` : "/root";

  const a = String(arg || "").trim();
  if (!a) return home;
  if (a === "~") return home;
  if (a.startsWith("~/")) return normalizePosixAbsolutePath(`${home}/${a.slice(2)}`);
  if (a.startsWith("/")) return normalizePosixAbsolutePath(a);

  // basic relative
  return normalizePosixAbsolutePath(`${cwd}/${a}`);
}

export default function TerminalPanel({ output, title, prompt, cwd, username, className, onStop, canStop, onRun, onCd }) {
  const xtermWriteRef = useRef(null);
  const lastOutLenRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef("");
  const promptShownRef = useRef(false);
  const [termReady, setTermReady] = useState(false);

  const printableTitle = useMemo(() => {
    const t = String(title || "");
    // Remove a couple of stray characters that can appear from encoding issues.
    return t.replace(/[ƒ?"]/g, "").trim() || "Not connected";
  }, [title]);

  useEffect(() => {
    if (!xtermWriteRef.current) return;

    const next = String(output || "");
    const prevLen = lastOutLenRef.current;

    if (next.length < prevLen) {
      // output was cleared/reset
      lastOutLenRef.current = 0;
      promptShownRef.current = false;
      xtermWriteRef.current("\x1b[2J\x1b[H"); // clear screen + home
      if (next) {
        xtermWriteRef.current(next.replace(/\r?\n/g, "\r\n"));
        lastOutLenRef.current = next.length;
      }
      return;
    }

    const delta = next.slice(prevLen);
    if (delta) {
      xtermWriteRef.current(delta.replace(/\r?\n/g, "\r\n"));
      lastOutLenRef.current = next.length;
    }
  }, [output]);

  // Write prompt when ready and not running
  const promptValueRef = useRef(prompt);
  useEffect(() => {
    promptValueRef.current = prompt;
  }, [prompt]);

  useEffect(() => {
    if (!termReady) return;
    if (!xtermWriteRef.current) return;
    if (!promptValueRef.current) return;
    if (canStop) return;
    if (inputRef.current) return;
    if (promptShownRef.current) return;
    xtermWriteRef.current(colorizePrompt(promptValueRef.current));
    promptShownRef.current = true;
  }, [termReady, canStop]);  // Removed 'prompt' from dependencies

  useEffect(() => {
    if (!termReady) return;
    if (!canStop) promptShownRef.current = false;
  }, [termReady, canStop]);

  const handleCopy = () => {
    navigator.clipboard.writeText(stripAnsi(output));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={
        "bg-black rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col min-h-0 " +
        (className || "h-[400px]")
      }
    >
      <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="flex gap-1.5 px-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
          <Terminal className="w-3 h-3" />
          {printableTitle}
        </div>
        <div className="flex items-center gap-2 pr-1">
          {canStop && (
            <button
              type="button"
              onClick={onStop}
              className="p-1 hover:bg-red-500/10 rounded transition-colors text-slate-500 hover:text-red-300"
              title="Stop running command"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-slate-300"
            title="Copy Output"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <XtermTerminal
          outputRef={xtermWriteRef}
          onReady={() => setTermReady(true)}
          onResize={() => {}}
          onData={(data) => {
            // Basic interactive input: type a line, press Enter to run via existing exec.
            if (!onRun) return;
            const prefix = colorizePrompt(prompt);

            // Ctrl+C stops running command if possible (best-effort)
            if (data === "\u0003") {
              if (canStop && onStop) onStop();
              return;
            }

            if (canStop) return; // avoid overlapping exec runs

            if (data === "\r") {
              const cmd = inputRef.current.trimEnd();
              inputRef.current = "";
              promptShownRef.current = false;
              xtermWriteRef.current?.("\r\n");
              const trimmed = cmd.trim();
              if (!trimmed) return;

              // Make `cd` persistent by mapping it to set_cwd.
              const cdMatch = trimmed.match(/^cd(?:\s+(.+))?$/);
              if (cdMatch && onCd) {
                const target = resolveCdTarget(cwd || "/", cdMatch[1], username);
                onCd(target);
                return;
              }

              onRun(trimmed);
              return;
            }

            // Backspace
            if (data === "\u007f") {
              if (!inputRef.current) return;
              inputRef.current = inputRef.current.slice(0, -1);
              xtermWriteRef.current?.("\b \b");
              return;
            }

            // Ignore other control sequences; accept printable input.
            if (data.length === 1 && data >= " ") {
              if (!promptShownRef.current) {
                xtermWriteRef.current?.(prefix);
                promptShownRef.current = true;
              }
              inputRef.current += data;
              xtermWriteRef.current?.(data);
            }
          }}
        />
      </div>
    </div>
  );
}
