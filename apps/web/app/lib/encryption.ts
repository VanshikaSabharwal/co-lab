import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const hex =
    process.env.ENCRYPTION_KEY ||
    "238d654b1ee39c0663cf2bb6602315cdbc48c322b3a06f50a90e92248468b743";
  const key = Buffer.from(hex.trim(), "hex");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex chars (32 bytes), got ${hex.trim().length} chars → ${key.length} bytes`,
    );
  }
  return key;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid encrypted text format");
  }
  const [ivHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function extractRepoName(repo: string): string {
  const urlMatch = repo.match(/github\.com\/[^/]+\/([^/]+?)(?:\.git)?$/);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  const parts = repo.replace(/\.git$/, "").split("/");
  return parts[parts.length - 1] || repo;
}
