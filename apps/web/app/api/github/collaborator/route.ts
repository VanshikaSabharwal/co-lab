import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "../../../lib/apiAuth";
import { sendCollaboratorInvite, refreshCollaboratorStatus } from "../../../lib/githubCollaborator";

// POST — owner invites a group member to become a repo collaborator.
// Body: { groupId, memberUserId }
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { groupId, memberUserId } = await req.json();
  if (!groupId || !memberUserId) {
    return NextResponse.json({ error: "groupId and memberUserId are required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.ownerId !== me.id) {
    return forbidden("Only the group owner can invite collaborators");
  }

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: memberUserId },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "That user is not a member of this group" }, { status: 404 });
  }

  const result = await sendCollaboratorInvite(groupId, memberUserId);

  if (result.status === "ERROR") {
    // 403 usually = org restricts outside collaborators → client offers the
    // GitHub settings deep-link as a fallback.
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.code === 403 ? 403 : 502 },
    );
  }

  return NextResponse.json({ codeAccess: result.status });
}

// GET — code-access status for every member of a group (owner view) or for
// the current user in a group. Reconciles against live GitHub state.
// Query: ?groupId=...  (optional &self=1)
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const self = searchParams.get("self") === "1";
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true, ownerName: true, githubRepo: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const isOwner = group.ownerId === me.id;

  // Self-check: reconcile my own status (catches email-based acceptance)
  if (self || !isOwner) {
    // The owner always has full code access (they hold the repo token)
    if (isOwner) {
      return NextResponse.json({ codeAccess: "ACTIVE", isOwner: true });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: me.id },
      select: { codeAccess: true },
    });
    if (!membership) return forbidden("Not a member of this group");

    if (membership.codeAccess === "INVITED") {
      await refreshCollaboratorStatus(groupId, me.id);
    }
    const fresh = await prisma.groupMember.findFirst({
      where: { groupId, userId: me.id },
      select: { codeAccess: true },
    });
    return NextResponse.json({ codeAccess: fresh?.codeAccess ?? "NONE" });
  }

  // Owner view: every member's status
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: {
      userId: true,
      codeAccess: true,
      user: { select: { name: true, image: true, email: true } },
    },
  });
  return NextResponse.json({
    isOwner: true,
    ownerId: group.ownerId,
    repo: `${group.ownerName}/${group.githubRepo}`,
    members,
  });
}
