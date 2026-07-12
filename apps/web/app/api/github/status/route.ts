import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../../lib/apiAuth";
import { getLinkedGithub, getGithubUsername, hasRepoScope } from "../../../lib/githubLink";

// Is the logged-in user's GitHub account linked, and does it have the scope
// needed to accept invites / push? Used by the profile card and group banners.
export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const linked = await getLinkedGithub(me.id);
  if (!linked) {
    return NextResponse.json({ linked: false });
  }

  const username = await getGithubUsername(me.id);
  return NextResponse.json({
    linked: true,
    username,
    hasRepoScope: hasRepoScope(linked.scope),
  });
}
