import { useState } from "react";
import "./App.css";
import { useSSH } from "./hooks/useSSH";
import ConnectionForm from "./components/ConnectionForm";
import TaskSearch from "./components/TaskSearch";
import CommandExecutor from "./components/CommandExecutor";
import TerminalOutput from "./components/TerminalOutput";

export default function App() {
  const {
    wsStatus,
    connected,
    running,
    output,
    connectSSH,
    disconnectSSH,
    runCommand,
    clearOutput
  } = useSSH();

  const [selectedCmd, setSelectedCmd] = useState("");

  const handleRun = () => {
    runCommand(selectedCmd);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2>Web SSH (MVP)</h2>

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
        onRun={handleRun}
        onClear={clearOutput}
        connected={connected}
        isRunning={running}
      />

      <TerminalOutput output={output} />

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
        MVP note: This uses password auth and accepts any host key. For production we’ll add host key
        verification, SSH keys, encryption, and per-user sessions.
      </p>
    </div>
  );
}