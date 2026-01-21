const { WebSocketServer } = require("ws");
const { Client } = require("ssh2");
const { v4: uuidv4 } = require("uuid");
const logger = require("./logger");
const prisma = require("./db");
const { verifyToken } = require("./auth");
const { createSession, getSession, updateSession, deleteSession, getOrConnectSSH, getOrCreateSftp, dropSftp, activeConnections } = require("./sessionManager");
const { encrypt, decrypt } = require("./crypto");

const activeExecs = new Map(); // execId -> { sessionId, stream, ws }

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

function execOnceWithInput(conn, command, input) {
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

      if (input != null) {
        stream.end(Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8"));
      } else {
        stream.end();
      }
    });
  });
}

function isSftpPermissionDenied(err) {
  const msg = String(err?.message || "");
  return err?.code === 3 || err?.code === "EACCES" || /permission denied/i.test(msg);
}

function sudoFailureToMessage(stderr) {
  const msg = String(stderr || "").trim();
  if (/sudo:\s*a password is required/i.test(msg) || /sudo:\s*no tty present/i.test(msg)) {
    return "Permission denied. This operation needs sudo, but this app can only use non-interactive sudo (NOPASSWD). Either use the Terminal, or configure NOPASSWD sudo for this user.";
  }
  if (/sudo:\s*command not found/i.test(msg)) return "sudo not found on the remote host.";
  return msg || "sudo command failed";
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

async function determineHostName(conn) {
  try {
    const { stdout, code } = await execOnce(conn, "hostname 2>/dev/null || uname -n");
    if (code === 0) {
      const name = String(stdout || "").trim().split(/\s+/)[0];
      if (name) return name;
    }
  } catch {
    // ignore
  }
  return null;
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

function parseSystemctlListUnits(output) {
  const lines = String(output || "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);

  const entries = [];
  for (const line of lines) {
    // UNIT LOAD ACTIVE SUB DESCRIPTION...
    const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const rawUnit = m[1];
    if (!rawUnit.endsWith(".service")) continue;
    const name = rawUnit.replace(/\.service$/i, "");
    const load = m[2];
    const state = m[3];
    const status = m[4];
    const description = m[5] || "";
    entries.push({ name, rawUnit, load, state, status, description });
  }
  return entries;
}

function parseSystemctlUnitFiles(output) {
  const lines = String(output || "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);

  const entries = [];
  for (const line of lines) {
    // UNIT FILE STATE [VENDOR PRESET]
    const m = line.match(/^(\S+)\s+(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const rawUnit = m[1];
    if (!rawUnit.endsWith(".service")) continue;
    const name = rawUnit.replace(/\.service$/i, "");
    const state = m[2] || "unknown";
    const description = (m[3] || "").trim();
    entries.push({ name, rawUnit, load: "n/a", state, status: state, description });
  }
  return entries;
}

function serviceSortRank(entry) {
  const state = String(entry.state || "").toLowerCase();
  const status = String(entry.status || "").toLowerCase();
  if (state === "active" && (status === "running" || status === "exited")) return 0;
  if (state === "failed" || status === "failed") return 1;
  return 2;
}

function parseDockerPs(output) {
  const lines = String(output || "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);

  const entries = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const name = parts[0];
    const image = parts[1];
    const status = parts[2];
    const id = parts[3];
    let state = "other";
    if (/^Up\b/i.test(status)) state = "running";
    else if (/^Exited\b/i.test(status)) state = "exited";
    entries.push({ name, id, image, status, state });
  }

  entries.sort((a, b) => {
    const rank = (x) => (x.state === "running" ? 0 : x.state === "exited" ? 1 : 2);
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

function parseDockerImages(output) {
  const lines = String(output || "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);

  const entries = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const ref = parts[0];
    const id = parts[1];
    const size = parts[2];
    entries.push({ ref, id, size });
  }

  entries.sort((a, b) => a.ref.localeCompare(b.ref));
  return entries;
}

function parseLinesToList(output) {
  return String(output || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "." && l !== "..");
}

function clampStringSize(str, maxBytes) {
  const buf = Buffer.from(String(str ?? ""), "utf8");
  if (buf.length <= maxBytes) return buf.toString("utf8");
  return buf.subarray(0, maxBytes).toString("utf8");
}

function sftpStat(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.stat(path, (err, stats) => {
      if (err) return reject(err);
      resolve(stats);
    });
  });
}

function sftpMkdir(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.mkdir(path, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sftpOpen(sftp, path, flags) {
  return new Promise((resolve, reject) => {
    sftp.open(path, flags, (err, handle) => {
      if (err) return reject(err);
      resolve(handle);
    });
  });
}

function sftpClose(sftp, handle) {
  return new Promise((resolve, reject) => {
    sftp.close(handle, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sftpRead(sftp, handle, length, position) {
  return new Promise((resolve, reject) => {
    if (length < 0) return reject(new Error("Invalid read length"));
    const buffer = Buffer.allocUnsafe(length);
    sftp.read(handle, buffer, 0, length, position, (err, bytesRead, buf) => {
      if (err) return reject(err);
      resolve(buf.subarray(0, bytesRead));
    });
  });
}

function sftpWriteAll(sftp, handle, data) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data ?? ""), "utf8");
    let offset = 0;

    const writeNext = () => {
      if (offset >= buffer.length) return resolve();
      sftp.write(handle, buffer, offset, buffer.length - offset, offset, (err, bytesWritten) => {
        if (err) return reject(err);
        offset += bytesWritten;
        writeNext();
      });
    };

    writeNext();
  });
}

function sftpRename(sftp, from, to) {
  return new Promise((resolve, reject) => {
    sftp.rename(from, to, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sftpUnlink(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.unlink(path, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sftpRmdir(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.rmdir(path, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sftpReaddir(sftp, path) {
  return new Promise((resolve, reject) => {
    sftp.readdir(path, (err, list) => {
      if (err) return reject(err);
      resolve(list || []);
    });
  });
}

async function sftpEnsureDir(sftp, path) {
  try {
    await sftpMkdir(sftp, path);
  } catch (err) {
    // If it already exists, accept it.
    const stats = await sftpStat(sftp, path);
    if (!stats.isDirectory?.()) throw err;
  }
}

async function sftpCopyFile(sftp, from, to) {
  const stats = await sftpStat(sftp, from);
  if (!stats.isFile?.()) throw new Error("Source is not a file");

  const readHandle = await sftpOpen(sftp, from, "r");
  const writeHandle = await sftpOpen(sftp, to, "w");

  try {
    const chunkSize = 64 * 1024;
    let position = 0;
    const size = typeof stats.size === "number" ? stats.size : 0;

    while (position < size) {
      const len = Math.min(chunkSize, size - position);
      const buf = await sftpRead(sftp, readHandle, len, position);
      await new Promise((resolve, reject) => {
        sftp.write(writeHandle, buf, 0, buf.length, position, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      position += buf.length;
      if (buf.length === 0) break;
    }
  } finally {
    await sftpClose(sftp, readHandle);
    await sftpClose(sftp, writeHandle);
  }
}

async function sftpCopyDirRecursive(sftp, fromDir, toDir, depth = 0) {
  if (depth > 32) throw new Error("Max copy depth exceeded");

  const stats = await sftpStat(sftp, fromDir);
  if (!stats.isDirectory?.()) throw new Error("Source is not a directory");

  await sftpEnsureDir(sftp, toDir);
  const list = await sftpReaddir(sftp, fromDir);

  for (const entry of list) {
    const name = entry.filename;
    if (!name || name === "." || name === "..") continue;

    const from = `${fromDir.replace(/\/+$/g, "")}/${name}`;
    const to = `${toDir.replace(/\/+$/g, "")}/${name}`;

    const type = classifySftpEntry(entry.attrs);
    if (type === "dir") {
      await sftpCopyDirRecursive(sftp, from, to, depth + 1);
    } else if (type === "file") {
      await sftpCopyFile(sftp, from, to);
    } else {
      throw new Error(`Unsupported entry type during copy: ${type} (${name})`);
    }
  }
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

      const replyOk = (payload) => {
        ws.send(JSON.stringify({ type: "ok", reqId: msg.reqId || null, ...payload }));
      };

      const replyError = (message) => {
        ws.send(JSON.stringify({ type: "error", reqId: msg.reqId || null, message }));
      };

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
          const hostName = await determineHostName(conn);
          await updateSession(sessionId, { cwd, hostName });
          activeConnections.set(sessionId, conn);
          ws.sessions.add(sessionId);
          
          ws.send(JSON.stringify({ 
            type: "connected", 
            payload: { sessionId, host, port, username, authType, cwd, hostName } 
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
          let session = await getSession(sessionId);

          if (session) {
            const patch = {};
            if (!session.cwd) patch.cwd = await determineInitialCwd(conn, session.username);
            if (!session.hostName) patch.hostName = await determineHostName(conn);
            if (Object.keys(patch).length) {
              session = await updateSession(sessionId, patch);
            }
          }
          ws.sessions.add(sessionId);
          
          ws.send(JSON.stringify({ 
            type: "status", 
            status: "connected", 
            sessionId,
            cwd: session?.cwd || "/",
            connection: session ? {
              host: session.host,
              hostName: session.hostName || null,
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

      // 2aa) LIST_SERVICES
      if (msg.type === "list_services") {
        const { sessionId } = msg.payload || {};
        try {
          const conn = await getOrConnectSSH(sessionId, ws);

          const cmdUnits = "systemctl list-units --type=service --all --no-legend --no-pager";
          const { stdout: out1, code: code1 } = await execOnce(conn, cmdUnits);
          let entries = parseSystemctlListUnits(out1);

          if (!entries.length || code1 !== 0) {
            const cmdFiles = "systemctl list-unit-files --type=service --no-legend --no-pager";
            const { stdout: out2 } = await execOnce(conn, cmdFiles);
            entries = parseSystemctlUnitFiles(out2);
          }

          entries.sort((a, b) => {
            const ra = serviceSortRank(a);
            const rb = serviceSortRank(b);
            if (ra !== rb) return ra - rb;
            return a.name.localeCompare(b.name);
          });

          ws.send(JSON.stringify({ type: "services_list", sessionId, entries }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `list_services failed: ${err.message}` }));
        }
        return;
      }

      // 2ab) LIST_DOCKER_CONTAINERS
      if (msg.type === "list_docker_containers") {
        const { sessionId } = msg.payload || {};
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const cmd = "docker ps -a --format '{{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.ID}}'";
          const { stdout, code, stderr } = await execOnce(conn, cmd);
          if (code !== 0) throw new Error(stderr || "docker ps failed");
          const entries = parseDockerPs(stdout);
          ws.send(JSON.stringify({ type: "docker_containers_list", sessionId, entries }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `list_docker_containers failed: ${err.message}` }));
        }
        return;
      }

      // 2ac) LIST_DOCKER_IMAGES
      if (msg.type === "list_docker_images") {
        const { sessionId } = msg.payload || {};
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const cmd = "docker images --format '{{.Repository}}:{{.Tag}}\\t{{.ID}}\\t{{.Size}}'";
          const { stdout, code, stderr } = await execOnce(conn, cmd);
          if (code !== 0) throw new Error(stderr || "docker images failed");
          const entries = parseDockerImages(stdout);
          ws.send(JSON.stringify({ type: "docker_images_list", sessionId, entries }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `list_docker_images failed: ${err.message}` }));
        }
        return;
      }

      // 2ad) LIST_NGINX_SITES
      if (msg.type === "list_nginx_sites") {
        const { sessionId } = msg.payload || {};
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const cmd = "ls -1 /etc/nginx/sites-enabled 2>/dev/null || true";
          const { stdout } = await execOnce(conn, cmd);
          const names = parseLinesToList(stdout);
          names.sort((a, b) => a.localeCompare(b));
          const entries = names.map((name) => ({ name }));
          ws.send(JSON.stringify({ type: "nginx_sites_list", sessionId, entries }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `list_nginx_sites failed: ${err.message}` }));
        }
        return;
      }

      // 2ae) LIST_NGINX_SITES_AVAILABLE
      if (msg.type === "list_nginx_sites_available") {
        const { sessionId } = msg.payload || {};
        try {
          const conn = await getOrConnectSSH(sessionId, ws);
          const cmd = "ls -1 /etc/nginx/sites-available 2>/dev/null || true";
          const { stdout } = await execOnce(conn, cmd);
          const names = parseLinesToList(stdout);
          names.sort((a, b) => a.localeCompare(b));
          const entries = names.map((name) => ({ name }));
          ws.send(JSON.stringify({ type: "nginx_sites_available_list", sessionId, entries }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `list_nginx_sites_available failed: ${err.message}` }));
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

      // 2d) MKDIR
      if (msg.type === "mkdir") {
        const { sessionId, path } = msg.payload || {};
        try {
          const dirPath = normalizePosixAbsolutePath(path);
          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);
          try {
            await sftpMkdir(sftp, dirPath);
          } catch (err) {
            if (!isSftpPermissionDenied(err)) throw err;
            const { code, stderr } = await execOnce(conn, `sudo -n mkdir -p -- ${shQuote(dirPath)}`);
            if (code !== 0) throw new Error(sudoFailureToMessage(stderr));
          }
          replyOk({ sessionId, action: "mkdir", path: dirPath });
        } catch (err) {
          replyError(`mkdir failed: ${err.message}`);
        }
        return;
      }

      // 2e) CREATE_FILE (empty)
      if (msg.type === "create_file") {
        const { sessionId, path } = msg.payload || {};
        try {
          const filePath = normalizePosixAbsolutePath(path);
          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);
          try {
            const handle = await sftpOpen(sftp, filePath, "w");
            await sftpClose(sftp, handle);
          } catch (err) {
            if (!isSftpPermissionDenied(err)) throw err;
            const cmd = `sudo -n sh -lc 'umask 022; : > \"$1\"' _ ${shQuote(filePath)}`;
            const { code, stderr } = await execOnce(conn, cmd);
            if (code !== 0) throw new Error(sudoFailureToMessage(stderr));
          }
          replyOk({ sessionId, action: "create_file", path: filePath });
        } catch (err) {
          replyError(`create_file failed: ${err.message}`);
        }
        return;
      }

      // 2f) READ_FILE (text)
      if (msg.type === "read_file") {
        const { sessionId, path } = msg.payload || {};
        try {
          const filePath = normalizePosixAbsolutePath(path);
          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);

          const maxBytes = 512 * 1024; // 512KB
          let contentBuf = null;

          try {
            const stats = await sftpStat(sftp, filePath);
            if (!stats.isFile?.()) throw new Error("Not a regular file");
            if (typeof stats.size === "number" && stats.size > maxBytes) {
              throw new Error("File too large to open in editor (limit 512KB)");
            }

            const handle = await sftpOpen(sftp, filePath, "r");
            const size = typeof stats.size === "number" ? stats.size : maxBytes;
            const toRead = Math.min(size, maxBytes);
            contentBuf = toRead > 0 ? await sftpRead(sftp, handle, toRead, 0) : Buffer.alloc(0);
            await sftpClose(sftp, handle);
          } catch (err) {
            if (!isSftpPermissionDenied(err)) throw err;
            const cmd = `sudo -n sh -lc 'p=\"$1\"; [ -f \"$p\" ] || { echo \"Not a regular file\" 1>&2; exit 2; }; sz=$(wc -c < \"$p\" 2>/dev/null || echo 0); [ \"$sz\" -le ${maxBytes} ] || { echo \"File too large to open in editor (limit 512KB)\" 1>&2; exit 3; }; cat -- \"$p\"' _ ${shQuote(filePath)}`;
            const { stdout, stderr, code } = await execOnce(conn, cmd);
            if (code !== 0) throw new Error(sudoFailureToMessage(stderr));
            contentBuf = Buffer.from(String(stdout ?? ""), "utf8");
          }

          ws.send(JSON.stringify({
            type: "file",
            reqId: msg.reqId || null,
            sessionId,
            path: filePath,
            content: (contentBuf || Buffer.alloc(0)).toString("utf8"),
          }));
        } catch (err) {
          replyError(`read_file failed: ${err.message}`);
        }
        return;
      }

      // 2g) WRITE_FILE (text)
      if (msg.type === "write_file") {
        const { sessionId, path, content } = msg.payload || {};
        try {
          const filePath = normalizePosixAbsolutePath(path);
          const text = clampStringSize(content, 512 * 1024);
          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);

          try {
            const handle = await sftpOpen(sftp, filePath, "w");
            await sftpWriteAll(sftp, handle, text);
            await sftpClose(sftp, handle);
          } catch (err) {
            if (!isSftpPermissionDenied(err)) throw err;
            const { code, stderr } = await execOnceWithInput(conn, `sudo -n tee ${shQuote(filePath)} >/dev/null`, text);
            if (code !== 0) throw new Error(sudoFailureToMessage(stderr));
          }

          replyOk({ sessionId, action: "write_file", path: filePath });
        } catch (err) {
          replyError(`write_file failed: ${err.message}`);
        }
        return;
      }

      // 2h) RENAME
      if (msg.type === "rename_path") {
        const { sessionId, from, to } = msg.payload || {};
        try {
          const fromPath = normalizePosixAbsolutePath(from);
          const toPath = normalizePosixAbsolutePath(to);
          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);
          try {
            await sftpRename(sftp, fromPath, toPath);
          } catch (err) {
            if (!isSftpPermissionDenied(err)) throw err;
            const { code, stderr } = await execOnce(conn, `sudo -n mv -- ${shQuote(fromPath)} ${shQuote(toPath)}`);
            if (code !== 0) throw new Error(sudoFailureToMessage(stderr));
          }
          replyOk({ sessionId, action: "rename_path", from: fromPath, to: toPath });
        } catch (err) {
          replyError(`rename failed: ${err.message}`);
        }
        return;
      }

      // 2i) DELETE (file or empty dir)
      if (msg.type === "delete_path") {
        const { sessionId, path } = msg.payload || {};
        try {
          const targetPath = normalizePosixAbsolutePath(path);
          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);
          try {
            const stats = await sftpStat(sftp, targetPath);
            if (stats.isDirectory?.()) {
              await sftpRmdir(sftp, targetPath);
            } else {
              await sftpUnlink(sftp, targetPath);
            }
          } catch (err) {
            if (!isSftpPermissionDenied(err)) throw err;
            const cmd = `sudo -n sh -lc 'p=\"$1\"; if [ -d \"$p\" ]; then rmdir -- \"$p\"; else rm -f -- \"$p\"; fi' _ ${shQuote(targetPath)}`;
            const { code, stderr } = await execOnce(conn, cmd);
            if (code !== 0) throw new Error(sudoFailureToMessage(stderr));
          }

          replyOk({ sessionId, action: "delete_path", path: targetPath });
        } catch (err) {
          replyError(`delete failed: ${err.message}`);
        }
        return;
      }

      // 2j) COPY_PATH (file or dir)
      if (msg.type === "copy_path") {
        const { sessionId, from, toDir, name } = msg.payload || {};
        try {
          const fromPath = normalizePosixAbsolutePath(from);
          const destDir = normalizePosixAbsolutePath(toDir);
          const destName = String(name || "").trim() || fromPath.split("/").filter(Boolean).slice(-1)[0];
          if (!destName || destName.includes("/") || destName.includes("\\")) throw new Error("Invalid destination name");
          const toPath = `${destDir.replace(/\/+$/g, "")}/${destName}`;

          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);

          const stats = await sftpStat(sftp, fromPath);
          if (stats.isDirectory?.()) {
            await sftpCopyDirRecursive(sftp, fromPath, toPath);
          } else if (stats.isFile?.()) {
            await sftpCopyFile(sftp, fromPath, toPath);
          } else {
            throw new Error("Unsupported source type");
          }

          replyOk({ sessionId, action: "copy_path", from: fromPath, to: toPath });
        } catch (err) {
          replyError(`copy failed: ${err.message}`);
        }
        return;
      }

      // 2k) MOVE_PATH (rename; fallback to mv)
      if (msg.type === "move_path") {
        const { sessionId, from, toDir, name } = msg.payload || {};
        try {
          const fromPath = normalizePosixAbsolutePath(from);
          const destDir = normalizePosixAbsolutePath(toDir);
          const destName = String(name || "").trim() || fromPath.split("/").filter(Boolean).slice(-1)[0];
          if (!destName || destName.includes("/") || destName.includes("\\")) throw new Error("Invalid destination name");
          const toPath = `${destDir.replace(/\/+$/g, "")}/${destName}`;

          const conn = await getOrConnectSSH(sessionId, ws);
          const sftp = await getOrCreateSftp(sessionId, conn);

          try {
            await sftpRename(sftp, fromPath, toPath);
          } catch {
            // Fallback to shell mv (handles cross-device moves)
            const { code, stderr } = await execOnce(conn, `mv ${shQuote(fromPath)} ${shQuote(toPath)} 2>&1`);
            if (code !== 0) throw new Error(stderr || "Move failed");
          }

          replyOk({ sessionId, action: "move_path", from: fromPath, to: toPath });
        } catch (err) {
          replyError(`move failed: ${err.message}`);
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
          const execId = uuidv4();

          const auditLog = await prisma.auditLog.create({
            data: {
              userId: ws.userId,
              serverId: session.serverId,
              sessionId,
              command,
              status: "running"
            }
          });

          ws.send(JSON.stringify({ type: "exec_start", sessionId, execId, command, cwd }));

          conn.exec(wrappedCommand, { pty: true }, (err, stream) => {
            if (err) {
              ws.send(JSON.stringify({ type: "error", execId, message: `Exec failed: ${err.message}` }));
              return;
            }

            activeExecs.set(execId, { sessionId, stream, ws });

            stream.on("data", (data) => {
              ws.send(JSON.stringify({ type: "stdout", sessionId, execId, data: data.toString() }));
            });

            stream.stderr.on("data", (data) => {
              ws.send(JSON.stringify({ type: "stderr", sessionId, execId, data: data.toString() }));
            });

            stream.on("close", async (code, signal) => {
              activeExecs.delete(execId);
              await prisma.auditLog.update({
                where: { id: auditLog.id },
                data: { status: "finished", exitCode: code, finishedAt: new Date() }
              });
              ws.send(JSON.stringify({ type: "exec_end", sessionId, execId, code, signal }));
            });
          });
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        }
        return;
      }

      // 3b) EXEC_STOP
      if (msg.type === "exec_stop") {
        const { sessionId, execId } = msg.payload || {};
        try {
          const entry = activeExecs.get(execId);
          if (!entry || entry.sessionId !== sessionId) throw new Error("Running command not found");

          try {
            entry.stream.signal?.("INT");
          } catch {
            // ignore
          }

          setTimeout(() => {
            if (!activeExecs.has(execId)) return;
            try {
              entry.stream.close?.();
            } catch {
              try { entry.stream.end?.(); } catch { /* ignore */ }
            }
          }, 800);
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: `exec_stop failed: ${err.message}` }));
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
