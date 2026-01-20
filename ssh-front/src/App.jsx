import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const WS_URL = "ws://localhost:8080";

const TASKS = [
  {
    id: "check-os",
    title: "Detect OS",
    tags: ["system", "info"],
    command: `cat /etc/os-release || uname -a`,
  },
  {
    id: "node-install-ubuntu",
    title: "Install Node.js 20 (Ubuntu/Debian)",
    tags: ["node", "install"],
    command: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get update && sudo apt-get install -y nodejs`,
  },
  {
    id: "node-version",
    title: "Check Node version",
    tags: ["node", "info"],
    command: `node -v && npm -v`,
  },
  {
    id: "nginx-install",
    title: "Install Nginx (Ubuntu/Debian)",
    tags: ["nginx", "install"],
    command: `sudo apt-get update && sudo apt-get install -y nginx`,
  },
  {
    id: "ports",
    title: "Show listening ports",
    tags: ["network", "info"],
    command: `sudo ss -tulpn || netstat -tulpn`,
  },
];

export default function App() {
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [connected, setConnected] = useState(false);

  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCmd, setSelectedCmd] = useState("");
  const [running, setRunning] = useState(false);

  const [output, setOutput] = useState("");
  const outputRef = useRef(null);

  const wsRef = useRef(null);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TASKS;
    return TASKS.filter((t) => {
      const hay = `${t.title} ${t.tags.join(" ")} ${t.command}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search]);

  useEffect(() => {
    // autoscroll
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const connectWs = () => {
    if (wsRef.current && wsRef.current.readyState === 1) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => {
      setWsStatus("disconnected");
      setConnected(false);
      setRunning(false);
    };
    ws.onerror = () => setWsStatus("error");

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.type === "status") {
        if (msg.status === "connected") {
          setConnected(true);
          setOutput((o) => o + `\n[Connected]\n`);
        } else if (msg.status === "connecting") {
          setOutput((o) => o + `\n[Connecting...]\n`);
        } else {
          setConnected(false);
          setOutput((o) => o + `\n[Disconnected]\n`);
        }
      }

      if (msg.type === "server") {
        setOutput((o) => o + `\n${msg.message}\n`);
      }

      if (msg.type === "exec_start") {
        setRunning(true);
        setOutput((o) => o + `\n$ ${msg.command}\n`);
      }

      if (msg.type === "stdout") {
        setOutput((o) => o + msg.data);
      }

      if (msg.type === "stderr") {
        setOutput((o) => o + msg.data);
      }

      if (msg.type === "exec_end") {
        setRunning(false);
        setOutput((o) => o + `\n[Exit ${msg.code ?? "?"}]\n`);
      }

      if (msg.type === "error") {
        setRunning(false);
        setOutput((o) => o + `\n[Error] ${msg.message}\n`);
      }
    };
  };

  const handleConnect = () => {
    connectWs();
    // small delay is not required usually, but avoids edge cases on first open
    setTimeout(() => {
      wsRef.current?.send(
        JSON.stringify({
          type: "connect",
          payload: { host, port: Number(port), username, password },
        })
      );
    }, 50);
  };

  const handleDisconnect = () => {
    wsRef.current?.send(JSON.stringify({ type: "disconnect" }));
    wsRef.current?.close();
  };

  const runCommand = () => {
    if (!selectedCmd.trim()) return;
    wsRef.current?.send(JSON.stringify({ type: "exec", payload: { command: selectedCmd } }));
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2>Web SSH (MVP)</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3>Connect</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <input placeholder="Host / IP" value={host} onChange={(e) => setHost(e.target.value)} />
            <input
              placeholder="Port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={handleConnect} disabled={!host || !username || !password || running}>
                Connect
              </button>
              <button onClick={handleDisconnect} disabled={!connected}>
                Disconnect
              </button>

              <span style={{ marginLeft: "auto", fontSize: 12 }}>
                WS: {wsStatus} | SSH: {connected ? "connected" : "disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h3>Task Search</h3>
          <input
            placeholder="Search e.g. node, nginx, ports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          />

          <div style={{ maxHeight: 210, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: 10,
                  borderBottom: "1px solid #f1f1f1",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedCmd(t.command)}
              >
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{t.tags.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        <h3>Command</h3>
        <textarea
          rows={4}
          placeholder="Pick a task or write your own command..."
          value={selectedCmd}
          onChange={(e) => setSelectedCmd(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={runCommand} disabled={!connected || running || !selectedCmd.trim()}>
            {running ? "Running..." : "Execute"}
          </button>
          <button onClick={() => setOutput("")}>Clear Output</button>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        <h3>Terminal Output</h3>
        <pre
          ref={outputRef}
          style={{
            background: "#0b0f14",
            color: "#d7e2f0",
            padding: 12,
            borderRadius: 8,
            height: 320,
            overflow: "auto",
            fontSize: 13,
          }}
        >
          {output}
        </pre>
      </div>

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
        MVP note: This uses password auth and accepts any host key. For production we’ll add host key
        verification, SSH keys, encryption, and per-user sessions.
      </p>
    </div>
  );
}
