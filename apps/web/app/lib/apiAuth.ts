import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "./prisma";

/**
 * Identity for API routes comes from the server session — never from
 * client-supplied userId/phone params, which any caller can forge.
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

/** Session user plus their DB record (phone, name) for phone-keyed features. */
export async function getSessionUserRecord() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;
  return prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, phone: true, email: true, name: true },
  });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** True if the user owns or is a member of the group. */
export async function isGroupMember(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true, members: { select: { userId: true } } },
  });
  if (!group) return false;
  return group.ownerId === userId || group.members.some((m) => m.userId === userId);
}

/**
 * Server-side code-access gate: the group owner, or a member whose codeAccess
 * is ACTIVE. Call this in every route that writes to the repo or acts with the
 * owner's token on a member's behalf.
 *
 * The Editor's `canEdit` is a UI affordance only — a direct fetch bypasses it —
 * and GitHub's own 403 protects nothing on paths that use the owner token.
 *
 *   const gate = await requireCodeAccess(groupId, me.id);
 *   if (!gate.ok) return gate.res;
 */
export async function requireCodeAccess(
  groupId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) {
    return { ok: false, res: NextResponse.json({ error: "Group not found" }, { status: 404 }) };
  }
  // The owner holds the repo token, so they always have code access.
  if (group.ownerId === userId) return { ok: true };

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId },
    select: { codeAccess: true },
  });
  if (!membership) return { ok: false, res: forbidden("Not a member of this group") };
  if (membership.codeAccess !== "ACTIVE") {
    return { ok: false, res: forbidden("You need accepted code access for this action") };
  }
  return { ok: true };
}
