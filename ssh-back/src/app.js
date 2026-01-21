const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { register, login, verifyToken } = require("./auth");
const prisma = require("./db");
const { encrypt } = require("./crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });
  req.user = decoded;
  next();
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await register(email, password);
    res.json({ id: user.id, email: user.email });
  } catch (err) {
    res.status(400).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  if (!result) return res.status(401).json({ error: "Invalid credentials" });
  res.json(result);
});

// Saved Servers
app.get("/api/servers", authenticate, async (req, res) => {
  const servers = await prisma.savedServer.findMany({
    where: { userId: req.user.userId },
    select: { id: true, name: true, host: true, port: true, username: true, authType: true }
  });
  res.json(servers);
});

app.post("/api/servers", authenticate, async (req, res) => {
  const { name, host, port, username, authType, secret } = req.body;
  const { ciphertext, iv, tag } = encrypt(secret);
  
  const server = await prisma.savedServer.create({
    data: {
      userId: req.user.userId,
      name, host, port: Number(port), username, authType,
      encryptedSecret: ciphertext,
      secretIv: iv,
      secretTag: tag
    }
  });
  res.json({ id: server.id, name: server.name });
});

app.delete("/api/servers/:id", authenticate, async (req, res) => {
  await prisma.savedServer.deleteMany({
    where: { id: req.params.id, userId: req.user.userId }
  });
  res.json({ ok: true });
});

app.get("/health", (req, res) => res.json({ ok: true }));

module.exports = app;