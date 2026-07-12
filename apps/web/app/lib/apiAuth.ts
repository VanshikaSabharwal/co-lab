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
