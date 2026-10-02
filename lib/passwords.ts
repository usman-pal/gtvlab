import crypto from "node:crypto";

// scrypt with per-password salt. Stored as "scrypt$N$r$p$salt$hash" so parameters can be raised later.
const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scrypt(pw: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(pw, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(pw, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  const expected = Buffer.from(hash, "base64url");
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

/** Returns an error message, or null if the password is acceptable. */
export function passwordProblem(pw: string, confirm?: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "That password is too long.";
  if (confirm !== undefined && pw !== confirm) return "The passwords don't match.";
  return null;
}

export const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** Simple in-memory sliding-window limiter (single-server deployment). */
const buckets = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}
