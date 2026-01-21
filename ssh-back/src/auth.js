const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const prisma = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret";
const SALT_ROUNDS = 10;

async function register(email, password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: { email, passwordHash }
  });
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  return { user, token };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { register, login, verifyToken };
