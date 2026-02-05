import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import XtermTerminal from "./XtermTerminal";

export default function ShellTerminal({
  title,
  className,
  connected,
  onShellStart,
  onShellInput,
  onShellResize,
  onShellData
}) {
  const xtermWriteRef = useRef(null);
  const terminalSizeRef = useRef({ cols: 80, rows: 24 });

  // Register callback to receive shell data
  useEffect(() => {
    if (onShellData) {
      onShellData((data) => {
        // Use current value of ref when callback is invoked
        if (xtermWriteRef.current) {
          xtermWriteRef.current(data);
        }
      });
    }
  }, [onShellData]);

  const handleReady = () => {
    // Terminal is ready, start the shell with current size
    if (onShellStart && connected) {
      onShellStart(terminalSizeRef.current.cols, terminalSizeRef.current.rows);
    }
  };

  const handleData = (data) => {
    // Send user input to shell
    if (onShellInput) {
      onShellInput(data);
    }
  };

  const handleResize = (cols, rows) => {
    terminalSizeRef.current = { cols, rows };
    if (onShellResize) {
      onShellResize(cols, rows);
    }
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
          {title || (connected ? "Shell" : "Not connected")}
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 min-h-0">
        {connected ? (
          <XtermTerminal
            outputRef={xtermWriteRef}
            onReady={handleReady}
            onResize={handleResize}
            onData={handleData}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Not connected
          </div>
        )}
      </div>
    </div>
  );
}
