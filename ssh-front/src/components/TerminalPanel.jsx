import { useEffect, useRef, useState } from "react";
import { Copy, Check, Terminal, Square } from "lucide-react";

export default function TerminalPanel({ output, title, className, onStop, canStop }) {
  const outputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // autoscroll
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
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
          {title || "Not connected"}
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
      
      <pre
        ref={outputRef}
        className="flex-1 p-4 overflow-auto font-mono text-sm leading-relaxed text-slate-300 scrollbar-thin selection:bg-slate-700 selection:text-white"
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace"
        }}
      >
        {output || <span className="text-slate-700 italic">Waiting for input...</span>}
      </pre>
    </div>
  );
}
