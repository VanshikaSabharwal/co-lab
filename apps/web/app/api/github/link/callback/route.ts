import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { verifyLinkState, getBaseUrl } from "../../../../lib/githubLink";
import { sendCollaboratorInvite } from "../../../../lib/githubCollaborator";

// Step 2: GitHub redirects back here. Verify the signed state, exchange the
// code for a token, read the GitHub identity, and attach it to the SESSION
// user's account — no reliance on email matching.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const base = getBaseUrl();

  const fail = (reason: string) =>
    NextResponse.redirect(`${base}/profile?github=error&reason=${encodeURIComponent(reason)}`);

  if (!code || !state) return fail("missing_code");

  const userId = verifyLinkState(state);
  if (!userId) return fail("invalid_state");

  // Exchange code → access token
  let accessToken: string;
  let scope: string | null = null;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_ID,
        client_secret: process.env.GITHUB_SECRET,
        code,
        redirect_uri: `${base}/api/github/link/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return fail("token_exchange_failed");
    accessToken = tokenData.access_token;
    scope = tokenData.scope ?? null;
  } catch {
    return fail("token_exchange_failed");
  }

  // Read the GitHub identity (immutable id + current login)
  let githubUserId: string;
  let githubLogin: string;
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${accessToken}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!userRes.ok) return fail("github_user_failed");
    const gh = await userRes.json();
    githubUserId = String(gh.id);
    githubLogin = gh.login;
  } catch {
    return fail("github_user_failed");
  }

  // Guard: this GitHub account must not already be linked to a DIFFERENT user
  const existing = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "github", providerAccountId: githubUserId } },
    select: { userId: true },
  });
  if (existing && existing.userId !== userId) {
    return fail("github_account_taken");
  }

  // Upsert the Account row for the session user
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "github", providerAccountId: githubUserId } },
    update: { access_token: accessToken, scope, userId },
    create: {
      userId,
      type: "oauth",
      provider: "github",
      providerAccountId: githubUserId,
      access_token: accessToken,
      scope,
      token_type: "bearer",
    },
  });

  // Fire any collaborator invites that were queued while this user was unlinked.
  const pending = await prisma.groupMember.findMany({
    where: { userId, codeAccess: "PENDING_GITHUB" },
    select: { groupId: true },
  });
  await Promise.allSettled(pending.map((m) => sendCollaboratorInvite(m.groupId, userId)));

  return NextResponse.redirect(`${base}/profile?github=linked&login=${encodeURIComponent(githubLogin)}`);
}
