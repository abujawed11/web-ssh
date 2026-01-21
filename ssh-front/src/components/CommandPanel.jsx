import { Play, Eraser, TerminalSquare } from "lucide-react";

export default function CommandPanel({ selectedCmd, onCmdChange, onRun, onClear, isConnected, isRunning }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      onRun();
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col">
      <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
          <TerminalSquare className="w-4 h-4 text-emerald-400" />
          Command Editor
        </h3>
        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">
          Ctrl + Enter to run
        </span>
      </div>
      
      <div className="relative">
        <textarea
          rows={3}
          placeholder="Enter command to execute..."
          value={selectedCmd}
          onChange={(e) => onCmdChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-slate-900 p-4 text-sm font-mono text-emerald-400 placeholder-slate-600 outline-none resize-none focus:bg-slate-900/80 transition-colors"
          spellCheck={false}
        />
        
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button 
            onClick={onClear}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-all"
            title="Clear Output"
          >
            <Eraser className="w-4 h-4" />
          </button>
          
          <button 
            onClick={onRun} 
            disabled={!isConnected || isRunning || !selectedCmd.trim()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all shadow-lg shadow-emerald-900/20"
          >
            {isRunning ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            RUN
          </button>
        </div>
      </div>
    </div>
  );
}
