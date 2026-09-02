import { createHmac, timingSafeEqual } from "crypto";

// Verifies the short-lived HMAC tokens minted by the Next.js app
// (apps/web/app/lib/wsToken.ts). Both sides must share WS_AUTH_SECRET
// (falls back to NEXTAUTH_SECRET).

const SECRET = process.env.WS_AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!SECRET) {
  console.error(
    "⚠️  WS_AUTH_SECRET / NEXTAUTH_SECRET is not set — all WebSocket connections will be rejected.",
  );
}

export interface WsTokenClaims {
  /** User id. */
  sub: string;
  /**
   * Group ids the user belongs to, signed in by the Next.js app. This server
   * has no database, so workspace room admission is authorized from this
   * claim — see the room-join check in index.ts.
   */
  grp: string[];
}

export function verifyWsToken(token: string): WsTokenClaims | null {
  if (!SECRET) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = new Uint8Array(createHmac("sha256", SECRET).update(payload).digest());
  const given = new Uint8Array(Buffer.from(sig, "base64url"));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    // A token minted before the grp claim existed carries no group rights:
    // it authenticates, but fails closed at room admission.
    const grp = Array.isArray(data.grp) ? data.grp.filter((g: unknown) => typeof g === "string") : [];
    return { sub: data.sub, grp };
  } catch {
    return null;
  }
}
