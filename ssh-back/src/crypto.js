const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const MASTER_KEY = Buffer.from(process.env.MASTER_KEY, "hex");

if (MASTER_KEY.length !== 32) {
  throw new Error("MASTER_KEY must be 32 bytes (64 hex characters)");
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const tag = cipher.getAuthTag().toString("base64");
  
  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    tag: tag
  };
}

function decrypt(ciphertext, iv, tag) {
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

module.exports = { encrypt, decrypt };
