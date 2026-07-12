import { NextResponse } from "next/server";
import { getSessionUser, isGroupMember, unauthorized, forbidden } from "../../../lib/apiAuth";
import { getDefaultHeadSha } from "../../../lib/vcs";

// GET — current default-branch head sha, stamped onto drafts as baseSha when a
// member starts editing so their CR branch is cut from what they actually saw.
// Query: ?groupId=...
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "groupId is required" }, { status: 400 });

  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }

  try {
    const { defaultBranch, headSha } = await getDefaultHeadSha(groupId);
    return NextResponse.json({ defaultBranch, headSha });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
