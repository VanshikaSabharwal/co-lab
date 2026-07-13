import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { encrypt } from "../../../lib/encryption";
import { getSessionUser, unauthorized, forbidden } from "../../../lib/apiAuth";
import { getLinkedGithub } from "../../../lib/githubLink";

// POST — the group owner re-stores their current (fresh) GitHub token into the
// group, fixing a stale/expired stored token without recreating the group.
// Body: { groupId }
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const { groupId } = await req.json().catch(() => ({}));
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

    // Freshest source first: the current session's GitHub token (set at last
    // login). Fall back to the stored Account row if the session lacks it.
    let token: string | null =
      (me as { githubAccessToken?: string }).githubAccessToken ?? null;
    if (!token) {
      const linked = await getLinkedGithub(me.id);
      token = linked?.accessToken ?? null;
    }
    if (!token) {
      return NextResponse.json(
        { error: "No GitHub sign-in found. Reconnect GitHub, then try again.", needsRelink: true },
        { status: 400 },
      );
    }

    // Validate against GitHub before storing — if this is also stale, the owner
    // must re-authorize GitHub (link flow) to mint a fresh token.
    let ghStatus = 0;
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      ghStatus = res.status;
    } catch {
      return NextResponse.json({ error: "Couldn't reach GitHub" }, { status: 502 });
    }

    if (ghStatus === 401) {
      return NextResponse.json(
        {
          error: "Your GitHub sign-in has also expired. Reconnect GitHub, then try again.",
          needsRelink: true,
        },
        { status: 401 },
      );
    }
    if (ghStatus < 200 || ghStatus >= 300) {
      return NextResponse.json({ error: `GitHub returned ${ghStatus}` }, { status: 502 });
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { githubAccessToken: encrypt(token) },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Reconnect failed:", err);
    return NextResponse.json(
      { error: err?.message || "Reconnect failed" },
      { status: 500 },
    );
  }
}
