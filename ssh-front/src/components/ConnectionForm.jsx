import { useState, useEffect } from "react";
import api from "../api";

export default function ConnectionForm({ onConnect, onDisconnect, connected, wsStatus, isRunning }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [authType, setAuthType] = useState("password");
  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  
  const [savedServers, setSavedServers] = useState([]);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const { data } = await api.get("/servers");
      setSavedServers(data);
    } catch (err) {}
  };

  const handleConnect = () => {
    onConnect({ host, port, username, password, privateKey, authType, saveProfile, profileName });
  };

  const handleSelectServer = (srv) => {
    setHost(srv.host);
    setPort(srv.port);
    setUsername(srv.username);
    setAuthType(srv.authType);
    // Password/Key will be handled server-side if saved
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Connect</h3>
        <select onChange={(e) => {
          const srv = savedServers.find(s => s.id === e.target.value);
          if (srv) handleSelectServer(srv);
        }}>
          <option value="">Quick Connect / Saved Servers</option>
          {savedServers.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 8 }}>
          <input placeholder="Host / IP" value={host} onChange={(e) => setHost(e.target.value)} />
          <input placeholder="Port" type="number" value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
        
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAuthType("password")} style={{ background: authType === "password" ? "#ddd" : "transparent" }}>Password</button>
          <button onClick={() => setAuthType("key")} style={{ background: authType === "key" ? "#ddd" : "transparent" }}>SSH Key</button>
        </div>

        {authType === "password" ? (
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        ) : (
          <textarea placeholder="Private Key" rows={3} value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={saveProfile} onChange={e => setSaveProfile(e.target.checked)} />
          <span>Save Profile</span>
          {saveProfile && <input placeholder="Profile Name" value={profileName} onChange={e => setProfileName(e.target.value)} style={{ flex: 1 }} />}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleConnect} disabled={!host || !username || isRunning}>
            Connect
          </button>
          <button onClick={onDisconnect} disabled={!connected}>
            Disconnect
          </button>

          <span style={{ marginLeft: "auto", fontSize: 11 }}>
            WS: {wsStatus} | SSH: {connected ? "OK" : "NO"}
          </span>
        </div>
      </div>
    </div>
  );
}