import { useState, useRef, useEffect } from "react";

const WS_URL = "ws://localhost:8080";

export function useSSH() {
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  
  const wsRef = useRef(null);

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

  const connectSSH = (host, port, username, password) => {
    connectWs();
    setTimeout(() => {
      wsRef.current?.send(
        JSON.stringify({
          type: "connect",
          payload: { host, port: Number(port), username, password },
        })
      );
    }, 50);
  };

  const disconnectSSH = () => {
    wsRef.current?.send(JSON.stringify({ type: "disconnect" }));
    wsRef.current?.close();
  };

  const runCommand = (command) => {
    if (!command.trim()) return;
    wsRef.current?.send(JSON.stringify({ type: "exec", payload: { command } }));
  };

  const clearOutput = () => setOutput("");

  return {
    wsStatus,
    connected,
    running,
    output,
    connectSSH,
    disconnectSSH,
    runCommand,
    clearOutput
  };
}
