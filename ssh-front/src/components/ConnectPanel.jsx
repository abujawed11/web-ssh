import { useRef, useState, useEffect } from "react";
import api from "../api";
import clsx from "clsx";
import { Key, Lock, ShieldCheck, Server } from "lucide-react";

export default function ConnectPanel({ onConnect, wsStatus }) {
  const [activeTab, setActiveTab] = useState("password");
  const [savedServers, setSavedServers] = useState([]);
  const keyFileInputRef = useRef(null);
  
  // Form State
  const [host, setHost] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    api.get("/servers").then(res => setSavedServers(res.data)).catch(() => {});
  }, []);

  const handleConnect = () => {
    onConnect({ 
      host,
      port: Number(port),
      username,
      password,
      privateKey, 
      authType: activeTab === "mfa" ? "password" : activeTab, // backend uses 'password' + tryKeyboard for MFA usually
      saveProfile, profileName 
    });
  };

  const loadServer = (srv) => {
    setHost(srv.host);
    setPort(srv.port);
    setUsername(srv.username);
    setActiveTab(srv.authType === "key" ? "key" : "password");
  };

  const canConnect =
    !!host.trim() &&
    !!username.trim() &&
    (activeTab === "mfa" ||
      (activeTab === "password" && !!password) ||
      (activeTab === "key" && !!privateKey.trim()));

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          New Connection
        </h3>
        {wsStatus !== "connected" && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Connecting to service...
          </span>
        )}
      </div>

      <div className="p-5 space-y-5 flex-1 min-h-0 overflow-y-auto">
        {/* Saved Servers Quick Select */}
        {savedServers.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Saved Profiles</label>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => {
                const selectedId = e.target.value;
                const s = savedServers.find(x => String(x.id) === selectedId);
                if(s) loadServer(s);
              }}
              defaultValue=""
            >
              <option value="" disabled>Select a profile...</option>
              {savedServers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
              ))}
            </select>
          </div>
        )}

        {/* Host Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-slate-400">Host / IP</label>
            <input 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="192.168.1.1"
              value={host}
              onChange={e => setHost(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Port</label>
            <input 
              type="number"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="22"
              value={port}
              onChange={e => setPort(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Username</label>
          <input 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="root"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block">Authentication Method</label>
          <div className="flex bg-slate-900 p-1 rounded-lg">
            {[
              { id: 'password', label: 'Password', icon: Lock },
              { id: 'key', label: 'SSH Key', icon: Key },
              { id: 'mfa', label: 'Interactive', icon: ShieldCheck }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all",
                  activeTab === tab.id 
                    ? "bg-slate-700 text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Auth Inputs */}
        <div className="min-h-[80px]">
          {activeTab === 'password' && (
            <input 
              type="password"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          )}
          {activeTab === 'key' && (
            <div className="space-y-2">
              <input
                ref={keyFileInputRef}
                type="file"
                accept=".pem,.key,.ppk,.txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setPrivateKey(text);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => keyFileInputRef.current?.click()}
                className="w-full bg-slate-900 hover:bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4 text-blue-400" />
                Upload SSH Key File
              </button>

              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                value={privateKey}
                onChange={e => setPrivateKey(e.target.value)}
              />
            </div>
          )}
          {activeTab === 'mfa' && (
            <div className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              Interactive prompts will appear in a popup after connection.
            </div>
          )}
        </div>

        {/* Save Profile */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center h-5">
            <input
              id="save-profile"
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500 focus:ring-2"
              checked={saveProfile}
              onChange={e => setSaveProfile(e.target.checked)}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="save-profile" className="text-sm text-slate-300">Save as Profile</label>
          </div>
        </div>
        
        {saveProfile && (
           <input 
             className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none animate-in fade-in slide-in-from-top-1"
             placeholder="Profile Name (e.g. Production Web)"
             value={profileName}
             onChange={e => setProfileName(e.target.value)}
           />
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <button
          type="button"
          onClick={handleConnect}
          disabled={!canConnect}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
        >
          {activeTab === 'key' ? <Key className="w-4 h-4" /> : <Server className="w-4 h-4" />}
          {wsStatus === "connected" ? "Connect via SSH" : "Connect (service will auto-start)"}
        </button>
      </div>
    </div>
  );
}
