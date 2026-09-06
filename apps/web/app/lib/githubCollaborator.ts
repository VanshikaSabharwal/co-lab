import prisma from "./prisma";
import { decrypt, extractRepoName } from "./encryption";
import { getGithubUsername } from "./githubLink";

export type InviteResult =
  | { status: "ACTIVE" } // already a collaborator (PUT returned 204)
  | { status: "INVITED" } // invitation created (PUT returned 201)
  | { status: "PENDING_GITHUB" } // member hasn't linked GitHub yet
  | { status: "ERROR"; code: number; message: string };

// Sends (or confirms) a GitHub repo collaborator invitation for one member,
// using the group owner's stored token. Reused by the invite route and by the
// link callback (to fire invites queued while the member was unlinked).
export async function sendCollaboratorInvite(
  groupId: string,
  memberUserId: string,
): Promise<InviteResult> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { githubRepo: true, ownerName: true, githubAccessToken: true },
  });
  if (!group) return { status: "ERROR", code: 404, message: "Group not found" };

  const username = await getGithubUsername(memberUserId);
  if (!username) {
    // No linked GitHub identity — remember the intent, invite once they connect.
    await prisma.groupMember.updateMany({
      where: { groupId, userId: memberUserId },
      data: { codeAccess: "PENDING_GITHUB" },
    });
    return { status: "PENDING_GITHUB" };
  }

  let ownerToken: string;
  try {
    ownerToken = decrypt(group.githubAccessToken);
  } catch {
    ownerToken = group.githubAccessToken;
  }
  const repo = extractRepoName(group.githubRepo);

  const res = await fetch(
    `https://api.github.com/repos/${group.ownerName}/${repo}/collaborators/${username}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${ownerToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({ permission: "push" }),
    },
  );

  // 201 = invitation created; 204 = already a collaborator (no invite needed)
  if (res.status === 204) {
    await setCodeAccess(groupId, memberUserId, "ACTIVE");
    await notifyAccessGranted(groupId, memberUserId, "ACTIVE");
    return { status: "ACTIVE" };
  }
  if (res.status === 201) {
    await setCodeAccess(groupId, memberUserId, "INVITED");
    await notifyAccessGranted(groupId, memberUserId, "INVITED");
    return { status: "INVITED" };
  }

  const body = await res.json().catch(() => ({}));
  return {
    status: "ERROR",
    code: res.status,
    message: body.message || `GitHub returned ${res.status}`,
  };
}

/**
 * Tell the member they were granted access.
 *
 * Without this the grant was silent: the owner saw "invitation sent" and the
 * member saw nothing anywhere, so a pending GitHub invite could sit unaccepted
 * indefinitely. INVITED is the case that actually needs an action from them.
 */
async function notifyAccessGranted(
  groupId: string,
  memberUserId: string,
  status: "ACTIVE" | "INVITED",
) {
  try {
    const [group, member] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { groupName: true, ownerId: true, ownerName: true },
      }),
      prisma.user.findUnique({
        where: { id: memberUserId },
        select: { name: true, email: true },
      }),
    ]);
    if (!group) return;

    const memberName = member?.name || member?.email || "You";
    const message =
      status === "INVITED"
        ? `You've been invited as a code collaborator on ${group.groupName}. Accept the GitHub invitation from your profile to start pushing.`
        : `You now have push access to ${group.groupName}.`;

    await prisma.notifications.create({
      data: {
        // recipientId is who sees it; ownerId stays the group owner so the
        // older owner-scoped queries are unaffected.
        recipientId: memberUserId,
        type: "CODE_ACCESS",
        userId: memberUserId,
        userName: memberName,
        groupId,
        groupName: group.groupName,
        ownerId: group.ownerId,
        ownerName: group.ownerName,
        message,
      },
    });
  } catch (err) {
    // A failed notification must never fail the grant itself — the access was
    // already applied on GitHub by this point.
    console.error("Failed to write access notification:", err);
  }
}

async function setCodeAccess(
  groupId: string,
  userId: string,
  codeAccess: "NONE" | "PENDING_GITHUB" | "INVITED" | "ACTIVE",
) {
  await prisma.groupMember.updateMany({
    where: { groupId, userId },
    data: { codeAccess },
  });
}

/**
 * Removes a member's push access to the group repo and clears their codeAccess.
 *
 * Cancels any still-pending invitation as well — without that, a revoked member
 * can accept a stale invite email and walk straight back in. The DB is cleared
 * even when GitHub reports the user was never a collaborator (404), so local
 * state can never be more permissive than GitHub's.
 */
export async function revokeCollaborator(
  groupId: string,
  memberUserId: string,
): Promise<{ ok: boolean; message?: string }> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { githubRepo: true, ownerName: true, githubAccessToken: true },
  });
  if (!group) return { ok: false, message: "Group not found" };

  const username = await getGithubUsername(memberUserId);
  if (!username) {
    // Never had a linked identity, so no GitHub grant can exist. Clear locally.
    await setCodeAccess(groupId, memberUserId, "NONE");
    return { ok: true };
  }

  let ownerToken: string;
  try {
    ownerToken = decrypt(group.githubAccessToken);
  } catch {
    ownerToken = group.githubAccessToken;
  }
  const repo = extractRepoName(group.githubRepo);
  const headers = {
    Authorization: `token ${ownerToken}`,
    Accept: "application/vnd.github.v3+json",
  };

  const res = await fetch(
    `https://api.github.com/repos/${group.ownerName}/${repo}/collaborators/${username}`,
    { method: "DELETE", headers },
  );

  // 204 = removed; 404 = wasn't a collaborator. Both leave them without access.
  if (res.status !== 204 && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, message: body.message || `GitHub returned ${res.status}` };
  }

  // Cancel a pending invitation, which survives collaborator removal.
  try {
    const invRes = await fetch(
      `https://api.github.com/repos/${group.ownerName}/${repo}/invitations`,
      { headers },
    );
    if (invRes.ok) {
      const invites = await invRes.json();
      const mine = (Array.isArray(invites) ? invites : []).filter(
        (i: any) => i?.invitee?.login?.toLowerCase() === username.toLowerCase(),
      );
      await Promise.all(
        mine.map((i: any) =>
          fetch(
            `https://api.github.com/repos/${group.ownerName}/${repo}/invitations/${i.id}`,
            { method: "DELETE", headers },
          ),
        ),
      );
    }
  } catch {
    // Best-effort: the collaborator grant is already gone, which is the
    // access-bearing half. A leftover invite is caught by the next reconcile.
  }

  await setCodeAccess(groupId, memberUserId, "NONE");
  return { ok: true };
}

/** Is this member currently a collaborator on the group repo? (204/404 probe.) */
export async function refreshCollaboratorStatus(
  groupId: string,
  memberUserId: string,
): Promise<boolean> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { githubRepo: true, ownerName: true, githubAccessToken: true },
  });
  if (!group) return false;

  const username = await getGithubUsername(memberUserId);
  if (!username) return false;

  let ownerToken: string;
  try {
    ownerToken = decrypt(group.githubAccessToken);
  } catch {
    ownerToken = group.githubAccessToken;
  }
  const repo = extractRepoName(group.githubRepo);

  const res = await fetch(
    `https://api.github.com/repos/${group.ownerName}/${repo}/collaborators/${username}`,
    { headers: { Authorization: `token ${ownerToken}`, Accept: "application/vnd.github.v3+json" } },
  );

  // 204 = is a collaborator; reconcile DB in case they accepted via GitHub email
  if (res.status === 204) {
    await setCodeAccess(groupId, memberUserId, "ACTIVE");
    return true;
  }

  // 404 = definitively not a collaborator (removed on GitHub, or invite
  // revoked). Downgrade, otherwise stale ACTIVE rows keep push rights forever.
  // Only 404 is conclusive: on 5xx or rate-limiting we leave state untouched
  // rather than locking out the whole group during a GitHub outage.
  if (res.status === 404) {
    await setCodeAccess(groupId, memberUserId, "NONE");
  }
  return false;
}
