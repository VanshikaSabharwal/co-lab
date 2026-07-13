import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { encrypt } from "../../../lib/encryption";
import { getSessionUser, unauthorized, forbidden } from "../../../lib/apiAuth";
import { getLinkedGithub } from "../../../lib/githubLink";

// POST — the group owner re-stores their current (fresh) GitHub token into the
// group, fixing a stale/expired stored token without recreating the group.
// Body: { groupId }
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { groupId } = await req.json();
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.ownerId !== me.id) {
    return forbidden("Only the group owner can reconnect GitHub for this group");
  }

  // Get the owner's most recently linked GitHub token
  const linked = await getLinkedGithub(me.id);
  if (!linked?.accessToken) {
    return NextResponse.json(
      { error: "No GitHub account linked", needsRelink: true },
      { status: 400 },
    );
  }

  // Validate it against GitHub before storing — if this is also stale, the
  // owner must re-authorize GitHub first (link flow) to mint a fresh token.
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${linked.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (res.status === 401) {
      return NextResponse.json(
        {
          error: "Your GitHub sign-in has also expired. Reconnect GitHub, then try again.",
          needsRelink: true,
        },
        { status: 401 },
      );
    }
    if (!res.ok) {
      return NextResponse.json({ error: `GitHub error ${res.status}` }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Couldn't reach GitHub" }, { status: 502 });
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { githubAccessToken: encrypt(linked.accessToken) },
  });

  return NextResponse.json({ ok: true });
}
