import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getSessionUser, isGroupMember, unauthorized, forbidden } from "../../../../lib/apiAuth";

/** Requests older than this can be re-sent — the owner may simply have missed it. */
const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * A member asks the group owner for repository push access.
 *
 * Until now a member had no way to ask for anything: the collaborator panel
 * renders nothing for non-owners, and their only signal was an amber banner
 * inside the editor.
 *
 * Reuses the existing Notifications table rather than adding a model —
 * `ownerId` is the recipient field there, despite the name.
 */
export async function POST(_req: Request, { params }: { params: { groupId: string } }) {
  const { groupId } = params;

  const me = await getSessionUser();
  if (!me) return unauthorized();
  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true, ownerName: true, groupName: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  if (group.ownerId === me.id) {
    return NextResponse.json(
      { error: "You already have full access to this repository" },
      { status: 400 },
    );
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: me.id },
    select: { codeAccess: true },
  });
  if (membership?.codeAccess === "ACTIVE") {
    return NextResponse.json({ error: "You already have code access" }, { status: 400 });
  }

  // One open request per member per group per day, so the button can't be
  // used to spam the owner's notifications.
  const recent = await prisma.notifications.findFirst({
    where: {
      groupId,
      userId: me.id,
      ownerId: group.ownerId,
      createdAt: { gt: new Date(Date.now() - REQUEST_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json(
      { error: "You've already requested access — the owner has been notified" },
      { status: 429 },
    );
  }

  const requesterName = me.name || me.email || "A member";

  await prisma.notifications.create({
    data: {
      userId: me.id,
      groupId,
      userName: requesterName,
      ownerId: group.ownerId,
      ownerName: group.ownerName,
      groupName: group.groupName,
      message: `${requesterName} requested code access to ${group.groupName}`,
    },
  });

  return NextResponse.json({ requested: true }, { status: 201 });
}
