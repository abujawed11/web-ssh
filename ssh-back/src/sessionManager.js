const { Client } = require("ssh2");
const redis = require("./redis");
const prisma = require("./db");
const { decrypt } = require("./crypto");
const logger = require("./logger");

// In-memory map of active SSH connections (ephemeral)
const activeConnections = new Map();
const activeSftps = new Map();

const SESSION_TTL = 30 * 60; // 30 minutes in seconds

async function createSession(userId, serverData) {
  const sessionId = require("uuid").v4();
  const sessionKey = `webssh:sess:${sessionId}`;

  const sessionMetadata = {
    userId,
    host: serverData.host,
    port: serverData.port || 22,
    username: serverData.username,
    authType: serverData.authType,
    serverId: serverData.id || null,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey, JSON.stringify(sessionMetadata), "EX", SESSION_TTL);
  return sessionId;
}

async function getSession(sessionId) {
  const sessionKey = `webssh:sess:${sessionId}`;
  const data = await redis.get(sessionKey);
  if (!data) return null;
  
  // Refresh TTL
  await redis.expire(sessionKey, SESSION_TTL);
  return JSON.parse(data);
}

async function updateSession(sessionId, patch) {
  const sessionKey = `webssh:sess:${sessionId}`;
  const data = await redis.get(sessionKey);
  if (!data) return null;

  const session = JSON.parse(data);
  const next = {
    ...session,
    ...patch,
    lastUsedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey, JSON.stringify(next), "EX", SESSION_TTL);
  return next;
}

function dropSftp(sessionId) {
  const sftp = activeSftps.get(sessionId);
  try {
    sftp?.end?.();
  } catch {
    // ignore
  }
  activeSftps.delete(sessionId);
}

function getOrCreateSftp(sessionId, conn) {
  if (activeSftps.has(sessionId)) return Promise.resolve(activeSftps.get(sessionId));

  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      activeSftps.set(sessionId, sftp);

      try {
        sftp.on("close", () => {
          activeSftps.delete(sessionId);
        });
      } catch {
        // ignore
      }

      resolve(sftp);
    });
  });
}

async function deleteSession(sessionId) {
  const sessionKey = `webssh:sess:${sessionId}`;
  await redis.del(sessionKey);
  
  dropSftp(sessionId);
  const conn = activeConnections.get(sessionId);
  if (conn) {
    conn.end();
    activeConnections.delete(sessionId);
  }
}

async function getOrConnectSSH(sessionId, ws) {
  if (activeConnections.has(sessionId)) {
    return activeConnections.get(sessionId);
  }

  const session = await getSession(sessionId);
  if (!session) throw new Error("Session expired or not found");

  // Reconnect using saved credentials if needed
  let authConfig = {};
  
  if (session.serverId) {
    const savedServer = await prisma.savedServer.findUnique({ where: { id: session.serverId } });
    if (!savedServer) throw new Error("Saved server profile not found");
    
    const secret = decrypt(savedServer.encryptedSecret, savedServer.secretIv, savedServer.secretTag);
    
    if (session.authType === "password") {
      authConfig.password = secret;
    } else if (session.authType === "key") {
      authConfig.privateKey = secret;
    }
  } else {
    // This case would handle ephemeral connections if we stored creds in Redis (not recommended without extra encryption)
    // For now, MVP assumes saved profile or active session in memory.
    throw new Error("SSH Connection lost. Please reconnect.");
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on("ready", () => {
      activeConnections.set(sessionId, conn);
      resolve(conn);
    }).on("error", (err) => {
      logger.error(`SSH Connection Error (${sessionId}): ${err.message}`);
      reject(err);
    }).on("close", () => {
      activeConnections.delete(sessionId);
      dropSftp(sessionId);
      ws.send(JSON.stringify({ type: "status", status: "disconnected", sessionId }));
    });

    conn.connect({
      host: session.host,
      port: session.port,
      username: session.username,
      ...authConfig,
      readyTimeout: 20000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      hostVerifier: () => true
    });
  });
}

// Cleanup task for orphaned in-memory connections
setInterval(async () => {
  for (const sessionId of activeConnections.keys()) {
    const exists = await redis.exists(`webssh:sess:${sessionId}`);
    if (!exists) {
      const conn = activeConnections.get(sessionId);
      conn.end();
      activeConnections.delete(sessionId);
      logger.info(`Cleaned up expired session connection: ${sessionId}`);
    }
  }
}, 60000);

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getOrConnectSSH,
  getOrCreateSftp,
  dropSftp,
  activeConnections
};
