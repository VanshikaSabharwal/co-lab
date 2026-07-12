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
    return { status: "ACTIVE" };
  }
  if (res.status === 201) {
    await setCodeAccess(groupId, memberUserId, "INVITED");
    return { status: "INVITED" };
  }

  const body = await res.json().catch(() => ({}));
  return {
    status: "ERROR",
    code: res.status,
    message: body.message || `GitHub returned ${res.status}`,
  };
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
  return false;
}
