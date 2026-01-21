import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Login from "./components/Login";
import Header from "./components/Header";
import ConnectPanel from "./components/ConnectPanel";
import ConnectedCard from "./components/ConnectedCard";
import TaskPanel from "./components/TaskPanel";
import CommandPanel from "./components/CommandPanel";
import TerminalPanel from "./components/TerminalPanel";
import KIModal from "./components/KIModal";
import { useSSH } from "./hooks/useSSH";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const {
    wsStatus,
    connectionState, // The source of truth for connection info
    running,
    output,
    kiPrompt,
    connectSSH,
    disconnectSSH,
    runCommand,
    clearOutput,
    answerKI
  } = useSSH();

  const [selectedCmd, setSelectedCmd] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Login onLogin={setUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155'
          }
        }}
      />
      
      <Header 
        user={user} 
        onLogout={() => {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          window.location.reload();
        }} 
      />

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Top Section: Connection & Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[500px]">
          {/* Left Column: Connection Manager */}
          <div className="md:col-span-7 h-full min-h-0">
            {connectionState ? (
              <ConnectedCard 
                connection={connectionState} 
                onDisconnect={disconnectSSH} 
              />
            ) : (
              <ConnectPanel 
                onConnect={connectSSH} 
                wsStatus={wsStatus} 
              />
            )}
          </div>

          {/* Right Column: Task Library */}
          <div className="md:col-span-5 h-full min-h-0">
            <TaskPanel onSelectCommand={setSelectedCmd} />
          </div>
        </div>

        {/* Bottom Section: Command & Terminal */}
        <div className="space-y-6">
          <CommandPanel
            selectedCmd={selectedCmd}
            onCmdChange={setSelectedCmd}
            onRun={() => runCommand(selectedCmd)}
            onClear={clearOutput}
            isConnected={!!connectionState}
            isRunning={running}
          />
          
          <TerminalPanel output={output} />
        </div>
      </main>

      {/* Modals */}
      {kiPrompt && <KIModal prompt={kiPrompt} onSubmit={answerKI} />}
    </div>
  );
}
