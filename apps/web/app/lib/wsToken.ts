import { createHmac, timingSafeEqual } from "crypto";

// Short-lived HMAC-signed tokens that let the standalone WebSocket server
// (apps/web-socket) trust a userId without sharing the NextAuth session.
// Both apps must agree on WS_AUTH_SECRET (falls back to NEXTAUTH_SECRET).

const SECRET = process.env.WS_AUTH_SECRET || process.env.NEXTAUTH_SECRET;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export interface WsTokenClaims {
  /** User id. */
  sub: string;
  /**
   * Group ids this user belongs to. The WS server has no database, so room
   * admission is authorized from this claim rather than a lookup.
   */
  grp: string[];
}

/**
 * @param groupIds every group the user may join a room for. Omitting it mints
 *   a token that can authenticate but cannot enter any workspace room.
 */
export function signWsToken(userId: string, groupIds: string[] = [], ttlSeconds = 300): string {
  if (!SECRET) {
    throw new Error("WS_AUTH_SECRET or NEXTAUTH_SECRET must be set to sign WS tokens");
  }
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        sub: userId,
        grp: groupIds,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      }),
    ),
  );
  const sig = b64url(createHmac("sha256", SECRET).update(payload).digest());
  return `${payload}.${sig}`;
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
