import { useState, useEffect } from "react";
import "./App.css";
import { useSSH } from "./hooks/useSSH";
import ConnectionForm from "./components/ConnectionForm";
import TaskSearch from "./components/TaskSearch";
import CommandExecutor from "./components/CommandExecutor";
import TerminalOutput from "./components/TerminalOutput";
import Login from "./components/Login";
import KIModal from "./components/KIModal";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const {
    wsStatus,
    connected,
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
    return <Login onLogin={setUser} />;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Web SSH (Production MVP)</h2>
        <div style={{ fontSize: 13 }}>
          {user.email} | 
          <button onClick={() => {
            localStorage.clear();
            window.location.reload();
          }} style={{ marginLeft: 10, padding: "2px 8px" }}>Logout</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ConnectionForm
          onConnect={connectSSH}
          onDisconnect={disconnectSSH}
          connected={connected}
          wsStatus={wsStatus}
          isRunning={running}
        />

        <TaskSearch onSelectCommand={setSelectedCmd} />
      </div>

      <CommandExecutor
        selectedCmd={selectedCmd}
        onCmdChange={setSelectedCmd}
        onRun={() => runCommand(selectedCmd)}
        onClear={clearOutput}
        connected={connected}
        isRunning={running}
      />

      <TerminalOutput output={output} />

      {kiPrompt && <KIModal prompt={kiPrompt} onSubmit={answerKI} />}

      <p style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
        Architecture: Stateless Backend + Redis Session Store + Postgres Persistence. 
        Secrets encrypted with AES-256-GCM. Supports Password, Keys, and Keyboard-Interactive auth.
      </p>
    </div>
  );
}
