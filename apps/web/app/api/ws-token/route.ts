import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../lib/apiAuth";
import { signWsToken } from "../../lib/wsToken";

// Mint a short-lived token the client presents when opening a WebSocket
// connection. The WS server verifies it and derives the userId from it,
// so socket identity can't be spoofed via query params.
export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  return NextResponse.json({ token: signWsToken(me.id), userId: me.id });
}
