const { WebSocketServer } = require("ws");
const { Client } = require("ssh2");
const { v4: uuidv4 } = require("uuid");
const logger = require("./logger");
const prisma = require("./db");
const { verifyToken } = require("./auth");
const { createSession, getSession, updateSession, deleteSession, getOrConnectSSH, getOrCreateSftp, dropSftp, activeConnections } = require("./sessionManager");
const { encrypt, decrypt } = require("./crypto");

function shQuote(value) {
  const str = String(value ?? "");
  return `'${str.replace(/'/g, `'\\''`)}'`;
}

function normalizePosixAbsolutePath(input) {
  const raw = String(input ?? "").trim();
  if (!raw) throw new Error("Path is required");
  if (raw.includes("\0") || raw.includes("\r") || raw.includes("\n")) throw new Error("Invalid path");

  const standardized = raw.replace(/\\/g, "/");
  if (!standardized.startsWith("/")) throw new Error("Path must be absolute");

  const parts = standardized.split("/");
  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return `/${stack.join("/")}`;
}

function execOnce(conn, command) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    conn.exec(command, { pty: false }, (err, stream) => {
      if (err) return reject(err);

      stream.on("data", (data) => {
        stdout += data.toString();
      });

      stream.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      stream.on("close", (code, signal) => {
        resolve({ stdout, stderr, code, signal });
      });
    });
  });
}

async function determineInitialCwd(conn, username) {
  const home = `/home/${username}`;
  const cmd = `if [ -d ${shQuote(home)} ]; then printf %s ${shQuote(home)}; else printf %s /; fi`;
  try {
    const { stdout, code } = await execOnce(conn, cmd);
    if (code === 0) {
      const resolved = stdout.trim();
      if (resolved.startsWith("/")) return resolved;
    }
  } catch {
    // ignore and fall back
  }
  return "/";
}

function classifySftpEntry(attrs) {
  try {
    if (attrs?.isDirectory?.()) return "dir";
    if (attrs?.isFile?.()) return "file";
    if (attrs?.isSymbolicLink?.()) return "link";
  } catch {
    // ignore
  }
  return "other";
}

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.userId = null;
    ws.sessions = new Set(); // Track sessions for this WS

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // 0) AUTH
      if (msg.type === "auth") {
        const decoded = verifyToken(msg.token);
        if (decoded) {
          ws.userId = decoded.userId;
          ws.send(JSON.stringify({ type: "auth_ok" }));
        } else {
          ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
        }
        return;
      }

      // 1) CONNECT
      if (msg.type === "connect") {
        const { host, port = 22, username, password, privateKey, passphrase, saveProfile, profileName } = msg.payload || {};
        
        let authType = "password";
        let secret = password;
        if (privateKey) {
          authType = "key";
          secret = privateKey; // We'll store key as secret, maybe combine with passphrase if needed
        }

        const conn = new Client();
        
        conn.on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
          ws.send(JSON.stringify({ 
            type: "ki_prompt", 
            payload: { name, instructions, prompts: prompts.map(p => ({ prompt: p.prompt, echo: p.echo })) } 
          }));
          
          ws.once("ki_answer", (answerMsg) => {
            const parsed = JSON.parse(answerMsg.toString());
            finish(parsed.payload.answers);
          });
        });

        conn.on("ready", async () => {
          let serverId = null;
          if (saveProfile && ws.userId) {
            const { ciphertext, iv, tag } = encrypt(secret);
            const saved = await prisma.savedServer.create({
              data: {
                userId: ws.userId,
                name: profileName || host,
                host, port: Number(port), username, authType,
                encryptedSecret: ciphertext, secretIv: iv, secretTag: tag
              }
            });
            serverId = saved.id;
          }

          const sessionId = await createSession(ws.userId, { id: serverId, host, port, username, authType });
          const cwd = await determineInitialCwd(conn, username);
          await updateSession(sessionId, { cwd });
          activeConnections.set(sessionId, conn);
          ws.sessions.add(sessionId);
          
          ws.send(JSON.stringify({ 
            type: "connected", 
            payload: { sessionId, host, port, username, authType, cwd } 
          }));
          logger.info(`SSH Session created: ${sessionId}`, { userId: ws.userId, host });
        });

        conn.on("error", (err) => {
          ws.send(JSON.stringify({ type: "error", message: `SSH error: ${err.message}` }));
        });

        conn.connect({
          host, port, username, password, privateKey, passphrase,
          tryKeyboard: true,
          hostVerifier: () => true,
          readyTimeout: 20000
        });
        return;
      }

      // 2) ATTACH (Restore session after refresh)
      if (msg.type === "attach") {
        const { sessionId } = msg.payload;
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const session = await getSession(sessionId);
          ws.sessions.add(sessionId);
          
          ws.send(JSON.stringify({ 
            type: "status", 
            status: "connected", 
            sessionId,
            cwd: session?.cwd || "/",
            connection: session ? {
              host: session.host,
              port: session.port,
              username: session.username,
              authType: session.authType
            } : null
          }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
        return;
      }

      // 2a) GET_CWD
      if (msg.type === "get_cwd") {
        const { sessionId } = msg.payload || {};
        try {
          const session = await getSession(sessionId);
          if (!session) throw new Error("Session expired or not found");
          ws.send(JSON.stringify({ type: "cwd", sessionId, cwd: session.cwd || "/" }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
        return;
      }

      // 2b) SET_CWD
      if (msg.type === "set_cwd") {
        const { sessionId, path } = msg.payload || {};
        try {
          const nextCwd = normalizePosixAbsolutePath(path);
          const conn = await getOrConnectSSH(sessionId, ws);

          const { code } = await execOnce(conn, `test -d ${shQuote(nextCwd)}`);
          if (code !== 0) throw new Error(`Not a directory: ${nextCwd}`);

          await updateSession(sessionId, { cwd: nextCwd });
          ws.send(JSON.stringify({ type: "cwd", sessionId, cwd: nextCwd }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
        return;
      }

      // 2c) LIST_DIR
      if (msg.type === "list_dir") {
        const { sessionId } = msg.payload || {};
        try {
          const session = await getSession(sessionId);
          if (!session) throw new Error("Session expired or not found");

          const requestedPath = msg.payload?.path ? normalizePosixAbsolutePath(msg.payload.path) : (session.cwd || "/");
          const conn = await getOrConnectSSH(sessionId, ws);

          const listOnce = async () => {
            const sftp = await getOrCreateSftp(sessionId, conn);
            return new Promise((resolve, reject) => {
              sftp.readdir(requestedPath, (err, list) => {
                if (err) return reject(err);
                resolve(list);
              });
            });
          };

          let list;
          try {
            list = await listOnce();
          } catch (err) {
            // SFTP channel can die; drop cache and retry once.
            dropSftp(sessionId);
            list = await listOnce();
          }

          const entries = (list || []).map((e) => ({
            name: e.filename,
            type: classifySftpEntry(e.attrs),
            size: e.attrs?.size ?? null,
            mtime: e.attrs?.mtime ?? null,
          }));

          entries.sort((a, b) => {
            const aDir = a.type === "dir";
            const bDir = b.type === "dir";
            if (aDir !== bDir) return aDir ? -1 : 1;
            return a.name.localeCompare(b.name);
          });

          ws.send(JSON.stringify({ type: "dir_list", sessionId, path: requestedPath, entries }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `list_dir failed: ${err.message}` }));
        }
        return;
      }

      // 3) EXEC
      if (msg.type === "exec") {
        const { sessionId, command } = msg.payload;
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const session = await getSession(sessionId);
          const cwd = session?.cwd || "/";
          const wrappedCommand = `cd ${shQuote(cwd)} && ${command}`;

          const auditLog = await prisma.auditLog.create({
            data: {
              userId: ws.userId,
              serverId: session.serverId,
              sessionId,
              command,
              status: "running"
            }
          });

          ws.send(JSON.stringify({ type: "exec_start", sessionId, command, cwd }));

          conn.exec(wrappedCommand, { pty: true }, (err, stream) => {
            if (err) {
              ws.send(JSON.stringify({ type: "error", message: `Exec failed: ${err.message}` }));
              return;
            }

            stream.on("data", (data) => {
              ws.send(JSON.stringify({ type: "stdout", sessionId, data: data.toString() }));
            });

            stream.stderr.on("data", (data) => {
              ws.send(JSON.stringify({ type: "stderr", sessionId, data: data.toString() }));
            });

            stream.on("close", async (code, signal) => {
              await prisma.auditLog.update({
                where: { id: auditLog.id },
                data: { status: "finished", exitCode: code, finishedAt: new Date() }
              });
              ws.send(JSON.stringify({ type: "exec_end", sessionId, code, signal }));
            });
          });
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
        return;
      }

      // 4) DISCONNECT
      if (msg.type === "disconnect") {
        const { sessionId } = msg.payload;
        await deleteSession(sessionId);
        ws.sessions.delete(sessionId);
        ws.send(JSON.stringify({ type: "status", status: "disconnected", sessionId }));
        return;
      }
    });

    ws.on("close", () => {
      // We don't necessarily close SSH connections here because they should survive refresh
      // unless we want to implement a short timeout for re-attach.
      // Redis TTL will eventually clean them up if they are truly abandoned.
    });
  });

  return wss;
}

module.exports = setupWebSocket;
