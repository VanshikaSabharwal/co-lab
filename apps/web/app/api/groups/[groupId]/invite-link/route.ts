import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "../../../../lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "../../../../lib/apiAuth";
import { getRequestBaseUrl } from "../../../../lib/githubLink";

const LINK_TTL_DAYS = 7;

/**
 * Shareable join links for a group.
 *
 * The link grants **group membership only** — never repository push access.
 * Repo access stays an explicit per-member owner action, so a forwarded link
 * can't hand someone commit rights to the GitHub repo.
 */

function linkUrl(req: Request, token: string) {
  // Derived from the incoming request, so the link matches whatever host the
  // owner is actually on — custom domain, preview deploy or localhost. Env
  // config can be missing or stale; the request never is.
  return `${getRequestBaseUrl(req)}/join/${token}`;
}

async function requireOwner(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) return { error: NextResponse.json({ error: "Group not found" }, { status: 404 }) };
  if (group.ownerId !== userId) {
    return { error: forbidden("Only the group owner can manage invite links") };
  }
  return { ok: true as const };
}

/** Current active link, if any. */
export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const gate = await requireOwner(params.groupId, me.id);
  if (gate.error) return gate.error;

  const link = await prisma.groupInviteLink.findFirst({
    where: {
      groupId: params.groupId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    link ? { url: linkUrl(req, link.token), expiresAt: link.expiresAt, usedCount: link.usedCount } : { url: null },
  );
}

/** Mint a link, replacing any existing one so only one is valid at a time. */
export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const gate = await requireOwner(params.groupId, me.id);
  if (gate.error) return gate.error;

  const now = new Date();

  // Revoking the old link first means "regenerate" actually invalidates the
  // previous URL, rather than leaving several live keys in circulation.
  await prisma.groupInviteLink.updateMany({
    where: { groupId: params.groupId, revokedAt: null },
    data: { revokedAt: now },
  });

  const link = await prisma.groupInviteLink.create({
    data: {
      token: randomBytes(24).toString("base64url"),
      groupId: params.groupId,
      createdBy: me.id,
      expiresAt: new Date(now.getTime() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json(
    { url: linkUrl(req, link.token), expiresAt: link.expiresAt },
    { status: 201 },
  );
}

/** Revoke without minting a replacement. */
export async function DELETE(_req: Request, { params }: { params: { groupId: string } }) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const gate = await requireOwner(params.groupId, me.id);
  if (gate.error) return gate.error;

  await prisma.groupInviteLink.updateMany({
    where: { groupId: params.groupId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ revoked: true });
}
