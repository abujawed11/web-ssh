import { useState } from "react";

export default function ConnectionForm({ onConnect, onDisconnect, connected, wsStatus, isRunning }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");

  const handleConnect = () => {
    onConnect(host, port, username, password);
  };

  return (
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
          <button onClick={handleConnect} disabled={!host || !username || !password || isRunning}>
            Connect
          </button>
          <button onClick={onDisconnect} disabled={!connected}>
            Disconnect
          </button>

          <span style={{ marginLeft: "auto", fontSize: 12 }}>
            WS: {wsStatus} | SSH: {connected ? "connected" : "disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
}
