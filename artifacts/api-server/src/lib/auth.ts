import crypto from "crypto";

const sessions = new Map<string, string>();

// The original database stored password hashes as an HMAC using this value.
// We keep read compatibility so the existing Neon database can be reused.
// On the first successful login, the old hash is transparently upgraded to
// a salted scrypt hash and this legacy value is no longer used for that user.
const LEGACY_HMAC_SECRET = "privelux-secret";
const SCRYPT_PREFIX = "scrypt";
const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash.startsWith(`${SCRYPT_PREFIX}$`);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    const [, salt, expectedHex] = storedHash.split("$");
    if (!salt || !expectedHex) return false;

    const actual = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH);
    const expected = Buffer.from(expectedHex, "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  }

  const legacy = crypto
    .createHmac("sha256", LEGACY_HMAC_SECRET)
    .update(password)
    .digest("hex");

  const actual = Buffer.from(legacy, "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

export function createToken(username: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, username);
  return token;
}

export function validateToken(token: string): string | null {
  return sessions.get(token) ?? null;
}

export function deleteToken(token: string): void {
  sessions.delete(token);
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
