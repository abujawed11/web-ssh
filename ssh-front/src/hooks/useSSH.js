import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const WS_URL = "ws://localhost:8080";

export function useSSH() {
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected, connected, error
  const [connectionState, setConnectionState] = useState(null); // { sessionId, host, port, username, authType }
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [kiPrompt, setKiPrompt] = useState(null);
  
  const wsRef = useRef(null);
  const pendingConnectRef = useRef(null);

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
      setConnectionState(null);
      setRunning(false);
    };

    ws.onerror = () => {
      setWsStatus("error");
      toast.dismiss("ws_connecting");
      pendingConnectRef.current = null;
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
          localStorage.setItem("ssh_session_id", msg.payload.sessionId);
          setOutput(""); // Clear old output on new connect
          break;
        case "status":
          if (msg.status === "connected") {
            // Attach success
            toast.dismiss("attach");
            toast.success("Session Restored");
            if (msg.connection) {
              setConnectionState({ sessionId: msg.sessionId, ...msg.connection });
            } else {
              // Fallback if backend didn't send details (shouldn't happen with our fix)
              setConnectionState({ sessionId: msg.sessionId, host: "Restored Session", username: "Unknown", port: 22 });
            }
          } else {
            // Disconnect or Attach failed
            toast.dismiss("attach");
            setConnectionState(null);
            localStorage.removeItem("ssh_session_id");
          }
          break;
        case "ki_prompt":
          setKiPrompt(msg.payload);
          break;
        case "exec_start":
          setRunning(true);
          setOutput(o => o + `\n$ ${msg.command}\n`);
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
          toast.error(msg.message);
          break;
      }
    };
  }, []);

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

    if (!wsRef.current || wsRef.current.readyState !== 1) {
      pendingConnectRef.current = payload;
      toast.loading("Connecting to service...", { id: "ws_connecting" });
      connectWs();
      return;
    }

    toast.loading("Connecting...", { duration: 2000 });
    wsRef.current.send(JSON.stringify({ type: "connect", payload }));
  };

  const disconnectSSH = () => {
    if (connectionState?.sessionId) {
      wsRef.current?.send(JSON.stringify({ type: "disconnect", payload: { sessionId: connectionState.sessionId } }));
    }
    setConnectionState(null);
    localStorage.removeItem("ssh_session_id");
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
    running,
    output,
    kiPrompt,
    connectSSH,
    disconnectSSH,
    runCommand,
    clearOutput: () => setOutput(""),
    answerKI
  };
}
