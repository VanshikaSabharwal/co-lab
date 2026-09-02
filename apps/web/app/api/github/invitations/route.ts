import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized } from "../../../lib/apiAuth";
import { getLinkedGithub, hasRepoScope } from "../../../lib/githubLink";
import { extractRepoName } from "../../../lib/encryption";

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

// PATCH — accept an invitation in-app. Body: { invitationId }
export async function PATCH(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { invitationId } = await req.json();
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
  }

  const linked = await getLinkedGithub(me.id);
  if (!linked?.accessToken) {
    return NextResponse.json({ error: "GitHub is not linked" }, { status: 400 });
  }

  const headers = {
    Authorization: `token ${linked.accessToken}`,
    Accept: "application/vnd.github.v3+json",
  };

  // Resolve which repo this invitation is for BEFORE accepting: the accept call
  // returns 204 with no body, so afterwards there is nothing to match on. The
  // repo GitHub reports here — not a client-supplied groupId — decides which
  // membership gets activated.
  const listRes = await fetch("https://api.github.com/user/repository_invitations", { headers });
  if (!listRes.ok) {
    return NextResponse.json({ error: "Couldn't read your GitHub invitations" }, { status: 502 });
  }
  const pending = await listRes.json().catch(() => []);
  const invitation = (Array.isArray(pending) ? pending : []).find(
    (inv: any) => String(inv?.id) === String(invitationId),
  );
  // Only invitations addressed to this user appear in their own list, so a
  // miss means the id isn't theirs (or is already consumed).
  if (!invitation) {
    return NextResponse.json(
      { error: "That invitation is no longer pending for your account" },
      { status: 404 },
    );
  }
  const repoFullName: string | undefined = invitation.repository?.full_name;
  if (!repoFullName) {
    return NextResponse.json(
      { error: "Could not confirm which repository this invitation is for" },
      { status: 502 },
    );
  }

  const res = await fetch(`https://api.github.com/user/repository_invitations/${invitationId}`, {
    method: "PATCH",
    headers,
  });

  // 204 = accepted; 304 = already accepted
  if (res.status !== 204 && res.status !== 304) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: body.message || `GitHub returned ${res.status}` },
      { status: 502 },
    );
  }

  // Activate ONLY the memberships whose group points at the repo just accepted.
  // Matching in application code because githubRepo is stored inconsistently
  // (bare name or full URL), so extractRepoName is the reliable normalizer.
  const [invOwner, invRepo] = repoFullName.split("/");
  const invited = await prisma.groupMember.findMany({
    where: { userId: me.id, codeAccess: "INVITED" },
    select: { id: true, group: { select: { ownerName: true, githubRepo: true } } },
  });
  const matching = invited.filter(
    (m) =>
      m.group?.ownerName?.toLowerCase() === invOwner?.toLowerCase() &&
      extractRepoName(m.group.githubRepo).toLowerCase() === invRepo?.toLowerCase(),
  );

  if (matching.length > 0) {
    await prisma.groupMember.updateMany({
      where: { id: { in: matching.map((m) => m.id) } },
      data: { codeAccess: "ACTIVE" },
    });
  }

  return NextResponse.json({ accepted: true, repo: repoFullName, activated: matching.length });
}
