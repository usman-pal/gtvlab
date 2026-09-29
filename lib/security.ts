import crypto from "node:crypto";

/** 24 random bytes → 32-char URL-safe token. Not derived from any DB id. */
export function newToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s === "change-me") {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set in production");
    return "dev-insecure-secret";
  }
  return s;
}

export function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function unsubscribeToken(leadId: string) {
  return sign(`unsub:${leadId}`).slice(0, 24);
}
