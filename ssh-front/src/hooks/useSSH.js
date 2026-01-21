import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const WS_URL = "ws://localhost:8080";

export function useSSH() {
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected, connected, error
  const [connectionState, setConnectionState] = useState(null); // { sessionId, host, port, username, authType }
  const [cwd, setCwd] = useState("/");
  const [dirPath, setDirPath] = useState("/");
  const [dirEntries, setDirEntries] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [kiPrompt, setKiPrompt] = useState(null);
  
  const wsRef = useRef(null);
  const pendingConnectRef = useRef(null);
  const pendingDirRequestRef = useRef(null);
  const sessionIdRef = useRef(null);

  const send = useCallback((payload) => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return false;
    wsRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  // Initialize WS
  const connectWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === 0 || wsRef.current.readyState === 1)) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      toast.dismiss("ws_connecting");
      const token = localStorage.getItem("token");
      if (token) {
        ws.send(JSON.stringify({ type: "auth", token }));
      }
      
      const savedSession = localStorage.getItem("ssh_session_id");
      if (savedSession && !pendingConnectRef.current) {
        toast.loading("Restoring session...", { id: "attach" });
        ws.send(JSON.stringify({ type: "attach", payload: { sessionId: savedSession } }));
      }

      if (pendingConnectRef.current) {
        toast.loading("Connecting...", { duration: 2000 });
        ws.send(JSON.stringify({ type: "connect", payload: pendingConnectRef.current }));
        pendingConnectRef.current = null;
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      toast.dismiss("ws_connecting");
      pendingConnectRef.current = null;
      pendingDirRequestRef.current = null;
      sessionIdRef.current = null;
      setConnectionState(null);
      setCwd("/");
      setDirPath("/");
      setDirEntries([]);
      setDirLoading(false);
      setRunning(false);
    };

    ws.onerror = () => {
      setWsStatus("error");
      toast.dismiss("ws_connecting");
      pendingConnectRef.current = null;
      pendingDirRequestRef.current = null;
      sessionIdRef.current = null;
      toast.error("WebSocket connection error");
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch { return; }

      switch (msg.type) {
        case "auth_ok":
          console.log("WS Auth Successful");
          break;
        case "connected":
          // New connection success
          toast.success("SSH Connected");
          setConnectionState(msg.payload);
          sessionIdRef.current = msg.payload?.sessionId || null;
          if (msg.payload?.cwd) {
            setCwd(msg.payload.cwd);
            setDirPath(msg.payload.cwd);
            setDirLoading(true);
            send({ type: "list_dir", payload: { sessionId: msg.payload.sessionId, path: msg.payload.cwd } });
          } else {
            send({ type: "get_cwd", payload: { sessionId: msg.payload.sessionId } });
          }
          localStorage.setItem("ssh_session_id", msg.payload.sessionId);
          setOutput(""); // Clear old output on new connect
          break;
        case "status":
          if (msg.status === "connected") {
            // Attach success
            toast.dismiss("attach");
            toast.success("Session Restored");
            sessionIdRef.current = msg.sessionId || null;
            if (msg.connection) {
              setConnectionState({ sessionId: msg.sessionId, ...msg.connection });
            } else {
              // Fallback if backend didn't send details (shouldn't happen with our fix)
              setConnectionState({ sessionId: msg.sessionId, host: "Restored Session", username: "Unknown", port: 22 });
            }

            const nextCwd = msg.cwd || "/";
            setCwd(nextCwd);
            setDirPath(nextCwd);
            setDirLoading(true);
            send({ type: "list_dir", payload: { sessionId: msg.sessionId, path: nextCwd } });
          } else {
            // Disconnect or Attach failed
            toast.dismiss("attach");
            setConnectionState(null);
            localStorage.removeItem("ssh_session_id");
            sessionIdRef.current = null;
            setCwd("/");
            setDirPath("/");
            setDirEntries([]);
            setDirLoading(false);
          }
          break;
        case "cwd":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setCwd(msg.cwd || "/");
          setDirPath(msg.cwd || "/");
          setDirLoading(true);
          if (!send({ type: "list_dir", payload: { sessionId: msg.sessionId || sessionIdRef.current, path: msg.cwd || "/" } })) {
            pendingDirRequestRef.current = { kind: "list_dir", path: msg.cwd || "/" };
          }
          break;
        case "dir_list":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setDirPath(msg.path || "/");
          setDirEntries(Array.isArray(msg.entries) ? msg.entries : []);
          setDirLoading(false);
          break;
        case "ki_prompt":
          setKiPrompt(msg.payload);
          break;
        case "exec_start":
          setRunning(true);
          if (msg.cwd) setCwd(msg.cwd);
          setOutput(o => o + `\n${msg.cwd ? `${msg.cwd} ` : ""}$ ${msg.command}\n`);
          break;
        case "stdout":
        case "stderr":
          setOutput(o => o + msg.data);
          break;
        case "exec_end":
          setRunning(false);
          setOutput(o => o + `\n[Exit ${msg.code ?? "?"}]\n`);
          break;
        case "error":
          setRunning(false);
          setDirLoading(false);
          toast.error(msg.message);
          break;
      }
    };
  }, [send]);

  useEffect(() => {
    connectWs();
    return () => {
      // Keep WS alive on component unmount to prevent flicker, 
      // or close if you prefer strict cleanup.
    };
  }, [connectWs]);

  const connectSSH = (payload) => {
    // User explicitly wants a new session; don't auto-attach an old one.
    localStorage.removeItem("ssh_session_id");
    setConnectionState(null);
    sessionIdRef.current = null;
    setCwd("/");
    setDirPath("/");
    setDirEntries([]);
    setDirLoading(false);

    if (!wsRef.current || wsRef.current.readyState !== 1) {
      pendingConnectRef.current = payload;
      toast.loading("Connecting to service...", { id: "ws_connecting" });
      connectWs();
      return;
    }

    toast.loading("Connecting...", { duration: 2000 });
    wsRef.current.send(JSON.stringify({ type: "connect", payload }));
  };

  const listDir = (path) => {
    if (!connectionState?.sessionId) return;
    setDirLoading(true);
    if (!send({ type: "list_dir", payload: { sessionId: connectionState.sessionId, ...(path ? { path } : {}) } })) {
      pendingDirRequestRef.current = { kind: "list_dir", path: path || null };
    }
  };

  const setCwdRemote = (path) => {
    if (!connectionState?.sessionId) return;
    setDirLoading(true);
    if (!send({ type: "set_cwd", payload: { sessionId: connectionState.sessionId, path } })) {
      pendingDirRequestRef.current = { kind: "set_cwd", path };
    }
  };

  const disconnectSSH = () => {
    if (connectionState?.sessionId) {
      wsRef.current?.send(JSON.stringify({ type: "disconnect", payload: { sessionId: connectionState.sessionId } }));
    }
    setConnectionState(null);
    localStorage.removeItem("ssh_session_id");
    sessionIdRef.current = null;
    setCwd("/");
    setDirPath("/");
    setDirEntries([]);
    setDirLoading(false);
    toast("Disconnected");
  };

  const runCommand = (command) => {
    if (!command.trim() || !connectionState?.sessionId) return;
    wsRef.current?.send(JSON.stringify({ type: "exec", payload: { sessionId: connectionState.sessionId, command } }));
  };

  const answerKI = (answers) => {
    wsRef.current?.send(JSON.stringify({ type: "ki_answer", payload: { answers } }));
    setKiPrompt(null);
  };

  return {
    wsStatus,
    connectionState, // The source of truth for "Are we connected?"
    cwd,
    dirPath,
    dirEntries,
    dirLoading,
    running,
    output,
    kiPrompt,
    connectSSH,
    disconnectSSH,
    listDir,
    setCwd: setCwdRemote,
    runCommand,
    clearOutput: () => setOutput(""),
    answerKI
  };
}
