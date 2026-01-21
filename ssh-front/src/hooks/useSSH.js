import { useState, useRef, useEffect, useCallback } from "react";

const WS_URL = "ws://localhost:8080";

export function useSSH() {
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [sessionId, setSessionId] = useState(() => localStorage.getItem("ssh_session_id"));
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [kiPrompt, setKiPrompt] = useState(null);
  
  const wsRef = useRef(null);

  const connectWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === 1) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      const token = localStorage.getItem("token");
      if (token) {
        ws.send(JSON.stringify({ type: "auth", token }));
      }
      
      const savedSession = localStorage.getItem("ssh_session_id");
      if (savedSession) {
        ws.send(JSON.stringify({ type: "attach", payload: { sessionId: savedSession } }));
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      setConnected(false);
      setRunning(false);
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
          setConnected(true);
          setSessionId(msg.payload.sessionId);
          localStorage.setItem("ssh_session_id", msg.payload.sessionId);
          setOutput(o => o + `\n[Connected - Session: ${msg.payload.sessionId}]\n`);
          break;
        case "status":
          if (msg.status === "connected") {
            setConnected(true);
            setSessionId(msg.sessionId || sessionId);
            setOutput(o => o + `\n[Session Restored]\n`);
          } else {
            setConnected(false);
            setOutput(o => o + `\n[Disconnected]\n`);
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
          setOutput(o => o + `\n[Error] ${msg.message}\n`);
          break;
      }
    };
  }, [sessionId]);

  useEffect(() => {
    connectWs();
    return () => {
      // wsRef.current?.close();
    };
  }, [connectWs]);

  const connectSSH = (payload) => {
    wsRef.current?.send(JSON.stringify({ type: "connect", payload }));
  };

  const answerKI = (answers) => {
    wsRef.current?.send(JSON.stringify({ type: "ki_answer", payload: { answers } }));
    setKiPrompt(null);
  };

  const disconnectSSH = () => {
    if (sessionId) {
      wsRef.current?.send(JSON.stringify({ type: "disconnect", payload: { sessionId } }));
    }
    setSessionId(null);
    setConnected(false);
    localStorage.removeItem("ssh_session_id");
  };

  const runCommand = (command) => {
    if (!command.trim() || !sessionId) return;
    wsRef.current?.send(JSON.stringify({ type: "exec", payload: { sessionId, command } }));
  };

  return {
    wsStatus, connected, running, output, kiPrompt,
    connectSSH, disconnectSSH, runCommand, clearOutput: () => setOutput(""),
    answerKI
  };
}