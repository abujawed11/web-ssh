const { WebSocketServer } = require("ws");
const { Client } = require("ssh2");
const { v4: uuidv4 } = require("uuid");
const logger = require("./logger");
const prisma = require("./db");
const { verifyToken } = require("./auth");
const { createSession, getSession, deleteSession, getOrConnectSSH, activeConnections } = require("./sessionManager");
const { encrypt, decrypt } = require("./crypto");

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
          activeConnections.set(sessionId, conn);
          ws.sessions.add(sessionId);
          
          ws.send(JSON.stringify({ 
            type: "connected", 
            payload: { sessionId, host, port, username, authType } 
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

      // 3) EXEC
      if (msg.type === "exec") {
        const { sessionId, command } = msg.payload;
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const session = await getSession(sessionId);

          const auditLog = await prisma.auditLog.create({
            data: {
              userId: ws.userId,
              serverId: session.serverId,
              sessionId,
              command,
              status: "running"
            }
          });

          ws.send(JSON.stringify({ type: "exec_start", sessionId, command }));

          conn.exec(command, { pty: true }, (err, stream) => {
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