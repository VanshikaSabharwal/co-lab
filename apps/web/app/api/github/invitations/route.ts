import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized } from "../../../lib/apiAuth";
import { getLinkedGithub, hasRepoScope } from "../../../lib/githubLink";

// GET — list the current user's pending GitHub repo invitations (their token).
export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const linked = await getLinkedGithub(me.id);
  if (!linked?.accessToken) {
    return NextResponse.json({ linked: false, invitations: [] });
  }
  if (!hasRepoScope(linked.scope)) {
    // Token predates the repo scope — can't accept in-app; must re-link.
    return NextResponse.json({ linked: true, needsReauth: true, invitations: [] });
  }

  try {
    const res = await fetch("https://api.github.com/user/repository_invitations", {
      headers: {
        Authorization: `token ${linked.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ linked: true, invitations: [] });
    }
    const raw = await res.json();
    const invitations = (Array.isArray(raw) ? raw : []).map((inv: any) => ({
      id: inv.id,
      repo: inv.repository?.full_name,
      inviter: inv.inviter?.login,
      permissions: inv.permissions,
    }));
    return NextResponse.json({ linked: true, invitations });
  } catch {
    return NextResponse.json({ linked: true, invitations: [] });
  }
}

// PATCH — accept an invitation in-app. Body: { invitationId, groupId? }
export async function PATCH(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { invitationId, groupId } = await req.json();
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
  }

  const linked = await getLinkedGithub(me.id);
  if (!linked?.accessToken) {
    return NextResponse.json({ error: "GitHub is not linked" }, { status: 400 });
  }

  const res = await fetch(`https://api.github.com/user/repository_invitations/${invitationId}`, {
    method: "PATCH",
    headers: {
      Authorization: `token ${linked.accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  // 204 = accepted; 304 = already accepted
  if (res.status !== 204 && res.status !== 304) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: body.message || `GitHub returned ${res.status}` },
      { status: 502 },
    );
  }

  // Mark this group's membership ACTIVE (or all of mine if none specified)
  await prisma.groupMember.updateMany({
    where: { userId: me.id, codeAccess: "INVITED", ...(groupId ? { groupId } : {}) },
    data: { codeAccess: "ACTIVE" },
  });

  return NextResponse.json({ accepted: true });
}
