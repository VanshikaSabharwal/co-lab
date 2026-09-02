import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../lib/apiAuth";
import prisma from "../../lib/prisma";
import { signWsToken } from "../../lib/wsToken";

// Mint a short-lived token the client presents when opening a WebSocket
// connection. The WS server verifies it and derives the userId from it,
// so socket identity can't be spoofed via query params.
//
// The token also carries the groups this user belongs to. The WS server has no
// database, so that claim is what authorizes joining a group's board room —
// without it any authenticated user could join any group's room and read its
// live edits.
export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const [memberships, owned] = await Promise.all([
    prisma.groupMember.findMany({ where: { userId: me.id }, select: { groupId: true } }),
    // Owners have no GroupMember row of their own, so they must be added
    // separately or they'd be locked out of their own boards.
    prisma.group.findMany({ where: { ownerId: me.id }, select: { id: true } }),
  ]);

  const groupIds = Array.from(
    new Set([...memberships.map((m) => m.groupId), ...owned.map((g) => g.id)]),
  );

  return NextResponse.json({ token: signWsToken(me.id, groupIds), userId: me.id });
}
