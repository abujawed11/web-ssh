const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { Client } = require("ssh2");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Each WS connection manages one SSH client for MVP
wss.on("connection", (ws) => {
  const id = uuidv4();
  ws.ssh = null;
  ws.isReady = false;

  ws.send(JSON.stringify({ type: "server", message: `WS connected (${id})` }));

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // 1) CONNECT
    if (msg.type === "connect") {
      const { host, port = 22, username, password } = msg.payload || {};
      if (!host || !username || !password) {
        ws.send(JSON.stringify({ type: "error", message: "host/username/password required" }));
        return;
      }

      // Close any previous session
      if (ws.ssh) {
        try { ws.ssh.end(); } catch {}
        ws.ssh = null;
        ws.isReady = false;
      }

      const conn = new Client();
      ws.ssh = conn;

      conn
        .on("ready", () => {
          ws.isReady = true;
          ws.send(JSON.stringify({ type: "status", status: "connected" }));
        })
        .on("error", (err) => {
          ws.isReady = false;
          ws.send(JSON.stringify({ type: "error", message: `SSH error: ${err.message}` }));
        })
        .on("close", () => {
          ws.isReady = false;
          ws.send(JSON.stringify({ type: "status", status: "disconnected" }));
        });

      conn.connect({
        host,
        port,
        username,
        password,
        // MVP: allow unknown host keys (NOT recommended for production)
        hostVerifier: () => true,
        readyTimeout: 20000,
      });

      ws.send(JSON.stringify({ type: "status", status: "connecting" }));
      return;
    }

    // 2) RUN COMMAND (exec)
    if (msg.type === "exec") {
      const { command } = msg.payload || {};
      if (!ws.ssh || !ws.isReady) {
        ws.send(JSON.stringify({ type: "error", message: "Not connected" }));
        return;
      }
      if (!command || typeof command !== "string") {
        ws.send(JSON.stringify({ type: "error", message: "command required" }));
        return;
      }

      ws.send(JSON.stringify({ type: "exec_start", command }));

      ws.ssh.exec(command, { pty: true }, (err, stream) => {
        if (err) {
          ws.send(JSON.stringify({ type: "error", message: `Exec failed: ${err.message}` }));
          return;
        }

        stream.on("data", (data) => {
          ws.send(JSON.stringify({ type: "stdout", data: data.toString() }));
        });

        stream.stderr.on("data", (data) => {
          ws.send(JSON.stringify({ type: "stderr", data: data.toString() }));
        });

        stream.on("close", (code, signal) => {
          ws.send(JSON.stringify({ type: "exec_end", code, signal }));
        });
      });
      return;
    }

    // 3) DISCONNECT
    if (msg.type === "disconnect") {
      if (ws.ssh) {
        try { ws.ssh.end(); } catch {}
      }
      ws.ssh = null;
      ws.isReady = false;
      ws.send(JSON.stringify({ type: "status", status: "disconnected" }));
      return;
    }

    ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
  });

  ws.on("close", () => {
    if (ws.ssh) {
      try { ws.ssh.end(); } catch {}
    }
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`ssh-back listening on http://localhost:${PORT}`);
});
