import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const WS_URL = "ws://localhost:8080";

function stripAnsi(input) {
  const str = String(input ?? "");
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function buildPrompt(connection, cwd) {
  if (!connection) return "";
  const host = connection.hostName || connection.host || "host";
  const user = connection.username || "user";
  const path = cwd || "/";
  return `${user}@${host}:${path}`;
}

export function useSSH() {
  const [wsStatus, setWsStatus] = useState("disconnected"); // disconnected, connected, error
  const [connectionState, setConnectionState] = useState(null); // { sessionId, host, port, username, authType }
  const [cwd, setCwd] = useState("/");
  const [dirPath, setDirPath] = useState("/");
  const [dirEntries, setDirEntries] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [servicesCache, setServicesCache] = useState([]);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [dockerContainersCache, setDockerContainersCache] = useState([]);
  const [isFetchingDockerContainers, setIsFetchingDockerContainers] = useState(false);
  const [dockerImagesCache, setDockerImagesCache] = useState([]);
  const [isFetchingDockerImages, setIsFetchingDockerImages] = useState(false);
  const [nginxSitesCache, setNginxSitesCache] = useState([]);
  const [isFetchingNginxSites, setIsFetchingNginxSites] = useState(false);
  const [nginxSitesAvailableCache, setNginxSitesAvailableCache] = useState([]);
  const [isFetchingNginxSitesAvailable, setIsFetchingNginxSitesAvailable] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningExecId, setRunningExecId] = useState(null);
  const [output, setOutput] = useState("");
  const [kiPrompt, setKiPrompt] = useState(null);
  
  const wsRef = useRef(null);
  const pendingConnectRef = useRef(null);
  const pendingDirRequestRef = useRef(null);
  const sessionIdRef = useRef(null);
  const connectionRef = useRef(null);
  const cwdRef = useRef("/");
  const pendingReqRef = useRef(new Map());

  const request = useCallback((type, payload) => {
    const sessionId = payload?.sessionId ?? sessionIdRef.current;
    if (!sessionId) return Promise.reject(new Error("Not connected"));
    if (!wsRef.current || wsRef.current.readyState !== 1) return Promise.reject(new Error("WebSocket not ready"));

    const reqId = crypto.randomUUID();
    const message = { type, reqId, payload: { ...payload, sessionId } };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingReqRef.current.delete(reqId);
        reject(new Error("Request timed out"));
      }, 15000);

      pendingReqRef.current.set(reqId, { resolve, reject, timeout });
      wsRef.current.send(JSON.stringify(message));
    });
  }, []);

  const applyConnection = useCallback((next) => {
    connectionRef.current = next;
    setConnectionState(next);
  }, []);

  const applyCwd = useCallback((next) => {
    const value = next || "/";
    cwdRef.current = value;
    setCwd(value);
  }, []);

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

      if (pendingDirRequestRef.current && sessionIdRef.current) {
        const pending = pendingDirRequestRef.current;
        pendingDirRequestRef.current = null;
        if (pending.kind === "list_dir") {
          ws.send(JSON.stringify({ type: "list_dir", payload: { sessionId: sessionIdRef.current, ...(pending.path ? { path: pending.path } : {}) } }));
        } else if (pending.kind === "set_cwd" && pending.path) {
          ws.send(JSON.stringify({ type: "set_cwd", payload: { sessionId: sessionIdRef.current, path: pending.path } }));
        }
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      toast.dismiss("ws_connecting");
      toast.dismiss("attach");
      pendingConnectRef.current = null;
      pendingDirRequestRef.current = null;
      sessionIdRef.current = null;
      connectionRef.current = null;
      cwdRef.current = "/";
      setConnectionState(null);
      setCwd("/");
      setDirPath("/");
      setDirEntries([]);
      setDirLoading(false);
      setServicesCache([]);
      setIsFetchingServices(false);
      setDockerContainersCache([]);
      setIsFetchingDockerContainers(false);
      setDockerImagesCache([]);
      setIsFetchingDockerImages(false);
      setNginxSitesCache([]);
      setIsFetchingNginxSites(false);
      setNginxSitesAvailableCache([]);
      setIsFetchingNginxSitesAvailable(false);
      setRunning(false);
      setRunningExecId(null);
    };

    ws.onerror = () => {
      setWsStatus("error");
      toast.dismiss("ws_connecting");
      toast.dismiss("attach");
      pendingConnectRef.current = null;
      pendingDirRequestRef.current = null;
      sessionIdRef.current = null;
      connectionRef.current = null;
      cwdRef.current = "/";
      setServicesCache([]);
      setIsFetchingServices(false);
      setDockerContainersCache([]);
      setIsFetchingDockerContainers(false);
      setDockerImagesCache([]);
      setIsFetchingDockerImages(false);
      setNginxSitesCache([]);
      setIsFetchingNginxSites(false);
      setNginxSitesAvailableCache([]);
      setIsFetchingNginxSitesAvailable(false);
      setRunningExecId(null);
      toast.error("WebSocket connection error");
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch { return; }

      let requestHandled = false;
      if (msg?.reqId && pendingReqRef.current.has(msg.reqId)) {
        const pending = pendingReqRef.current.get(msg.reqId);
        clearTimeout(pending.timeout);
        pendingReqRef.current.delete(msg.reqId);
        requestHandled = true;

        if (msg.type === "error") {
          pending.reject(new Error(msg.message || "Request failed"));
        } else {
          pending.resolve(msg);
        }
      }

      switch (msg.type) {
        case "auth_ok":
          console.log("WS Auth Successful");
          break;
        case "connected":
          // New connection success
          toast.dismiss("attach");
          toast.success("SSH Connected");
          applyConnection(msg.payload);
          sessionIdRef.current = msg.payload?.sessionId || null;
          if (msg.payload?.cwd) {
            applyCwd(msg.payload.cwd);
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
              applyConnection({ sessionId: msg.sessionId, ...msg.connection });
            } else {
              // Fallback if backend didn't send details (shouldn't happen with our fix)
              applyConnection({ sessionId: msg.sessionId, host: "Restored Session", username: "Unknown", port: 22 });
            }

            const nextCwd = msg.cwd || "/";
            applyCwd(nextCwd);
            setDirPath(nextCwd);
            setDirLoading(true);
            send({ type: "list_dir", payload: { sessionId: msg.sessionId, path: nextCwd } });
          } else {
            // Disconnect or Attach failed
            toast.dismiss("attach");
            applyConnection(null);
            localStorage.removeItem("ssh_session_id");
            sessionIdRef.current = null;
            applyCwd("/");
            setDirPath("/");
            setDirEntries([]);
            setDirLoading(false);
          }
          break;
        case "cwd":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          applyCwd(msg.cwd || "/");
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
          setRunningExecId(msg.execId || null);
          if (msg.cwd) applyCwd(msg.cwd);
          setOutput((o) => {
            const prompt = buildPrompt(connectionRef.current, msg.cwd || cwdRef.current);
            return o + `\n${prompt ? `${prompt} ` : ""}$ ${msg.command}\n`;
          });
          break;
        case "stdout":
        case "stderr":
          setOutput((o) => o + stripAnsi(msg.data));
          break;
        case "exec_end":
          setRunning(false);
          setRunningExecId(null);
          setOutput(o => o + `\n[Exit ${msg.code ?? "?"}]\n`);
          break;
        case "services_list":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setServicesCache(Array.isArray(msg.entries) ? msg.entries : []);
          setIsFetchingServices(false);
          break;
        case "docker_containers_list":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setDockerContainersCache(Array.isArray(msg.entries) ? msg.entries : []);
          setIsFetchingDockerContainers(false);
          break;
        case "docker_images_list":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setDockerImagesCache(Array.isArray(msg.entries) ? msg.entries : []);
          setIsFetchingDockerImages(false);
          break;
        case "nginx_sites_list":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setNginxSitesCache(Array.isArray(msg.entries) ? msg.entries : []);
          setIsFetchingNginxSites(false);
          break;
        case "nginx_sites_available_list":
          if (msg.sessionId && sessionIdRef.current && msg.sessionId !== sessionIdRef.current) break;
          setNginxSitesAvailableCache(Array.isArray(msg.entries) ? msg.entries : []);
          setIsFetchingNginxSitesAvailable(false);
          break;
        case "error":
          toast.dismiss("attach");
          setRunning(false);
          setDirLoading(false);
          if (!requestHandled) toast.error(msg.message);
          setIsFetchingServices(false);
          setIsFetchingDockerContainers(false);
          setIsFetchingDockerImages(false);
          setIsFetchingNginxSites(false);
          setIsFetchingNginxSitesAvailable(false);
          break;
      }
    };
  }, [applyConnection, applyCwd, send]);

  useEffect(() => {
    connectWs();
    return () => {
      // Keep WS alive on component unmount to prevent flicker, 
      // or close if you prefer strict cleanup.
    };
  }, [connectWs]);

  const connectSSH = (payload) => {
    // User explicitly wants a new session; don't auto-attach an old one.
    toast.dismiss("attach");
    localStorage.removeItem("ssh_session_id");
    applyConnection(null);
    sessionIdRef.current = null;
    applyCwd("/");
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

  const mkdir = (path) => request("mkdir", { path });
  const createFile = (path) => request("create_file", { path });
  const renamePath = (from, to) => request("rename_path", { from, to });
  const deletePath = (path) => request("delete_path", { path });
  const copyPath = (from, toDir, name) => request("copy_path", { from, toDir, ...(name ? { name } : {}) });
  const movePath = (from, toDir, name) => request("move_path", { from, toDir, ...(name ? { name } : {}) });
  const readFile = async (path) => {
    const res = await request("read_file", { path });
    return { path: res.path, content: res.content };
  };
  const writeFile = (path, content) => request("write_file", { path, content });

  const disconnectSSH = () => {
    if (connectionState?.sessionId) {
      wsRef.current?.send(JSON.stringify({ type: "disconnect", payload: { sessionId: connectionState.sessionId } }));
    }
    applyConnection(null);
    localStorage.removeItem("ssh_session_id");
    sessionIdRef.current = null;
    applyCwd("/");
    setDirPath("/");
    setDirEntries([]);
    setDirLoading(false);
    toast("Disconnected");
  };

  const runCommand = (command) => {
    if (!command.trim() || !connectionState?.sessionId) return;
    wsRef.current?.send(JSON.stringify({ type: "exec", payload: { sessionId: connectionState.sessionId, command } }));
  };

  const stopExec = (execId) => {
    if (!connectionState?.sessionId || !execId) return;
    wsRef.current?.send(JSON.stringify({ type: "exec_stop", payload: { sessionId: connectionState.sessionId, execId } }));
  };

  const fetchServices = () => {
    if (!connectionState?.sessionId) return;
    setIsFetchingServices(true);
    wsRef.current?.send(JSON.stringify({ type: "list_services", payload: { sessionId: connectionState.sessionId } }));
  };

  const fetchDockerContainers = () => {
    if (!connectionState?.sessionId) return;
    setIsFetchingDockerContainers(true);
    wsRef.current?.send(JSON.stringify({ type: "list_docker_containers", payload: { sessionId: connectionState.sessionId } }));
  };

  const fetchDockerImages = () => {
    if (!connectionState?.sessionId) return;
    setIsFetchingDockerImages(true);
    wsRef.current?.send(JSON.stringify({ type: "list_docker_images", payload: { sessionId: connectionState.sessionId } }));
  };

  const fetchNginxSites = () => {
    if (!connectionState?.sessionId) return;
    setIsFetchingNginxSites(true);
    wsRef.current?.send(JSON.stringify({ type: "list_nginx_sites", payload: { sessionId: connectionState.sessionId } }));
  };

  const fetchNginxSitesAvailable = () => {
    if (!connectionState?.sessionId) return;
    setIsFetchingNginxSitesAvailable(true);
    wsRef.current?.send(
      JSON.stringify({ type: "list_nginx_sites_available", payload: { sessionId: connectionState.sessionId } })
    );
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
    servicesCache,
    isFetchingServices,
    dockerContainersCache,
    isFetchingDockerContainers,
    dockerImagesCache,
    isFetchingDockerImages,
    nginxSitesCache,
    isFetchingNginxSites,
    nginxSitesAvailableCache,
    isFetchingNginxSitesAvailable,
    running,
    runningExecId,
    output,
    kiPrompt,
    connectSSH,
    disconnectSSH,
    listDir,
    setCwd: setCwdRemote,
    mkdir,
    createFile,
    renamePath,
    deletePath,
    copyPath,
    movePath,
    readFile,
    writeFile,
    runCommand,
    stopExec,
    fetchServices,
    fetchDockerContainers,
    fetchDockerImages,
    fetchNginxSites,
    fetchNginxSitesAvailable,
    clearOutput: () => setOutput(""),
    answerKI
  };
}
