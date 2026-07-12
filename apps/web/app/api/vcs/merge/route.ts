import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "../../../lib/apiAuth";
import { getRepoContext } from "../../../lib/vcs";

// POST — owner approves a change request: squash-merge the PR, delete the
// branch, mark the CR MERGED. Body: { changeRequestId }
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { changeRequestId } = await req.json();
  if (!changeRequestId) {
    return NextResponse.json({ error: "changeRequestId is required" }, { status: 400 });
  }

  const cr = await prisma.changeRequest.findUnique({
    where: { id: changeRequestId },
    select: { id: true, groupId: true, branchName: true, prNumber: true, status: true },
  });
  if (!cr) return NextResponse.json({ error: "Change request not found" }, { status: 404 });

  const group = await prisma.group.findUnique({
    where: { id: cr.groupId },
    select: { ownerId: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.ownerId !== me.id) return forbidden("Only the group owner can merge change requests");

  if (cr.status !== "OPEN" || !cr.prNumber) {
    return NextResponse.json({ error: `Change request is ${cr.status}, not mergeable` }, { status: 400 });
  }

  let ctx;
  try {
    ctx = await getRepoContext(cr.groupId);
  } catch (err: any) {
    return NextResponse.json({ error: `Couldn't reach the repo: ${err.message}` }, { status: 502 });
  }

  // GitHub computes mergeability asynchronously — confirm it's settled & true
  try {
    const { data: pr } = await ctx.octokit.rest.pulls.get({
      owner: ctx.owner,
      repo: ctx.repo,
      pull_number: cr.prNumber,
    });
    if (pr.mergeable === false) {
      await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "CONFLICT" } });
      return NextResponse.json(
        { error: "This change request now conflicts with main and can't be merged.", status: "CONFLICT" },
        { status: 409 },
      );
    }
  } catch {
    /* if we can't read it, let the merge attempt surface the error */
  }

  try {
    await ctx.octokit.rest.pulls.merge({
      owner: ctx.owner,
      repo: ctx.repo,
      pull_number: cr.prNumber,
      merge_method: "squash",
    });
  } catch (err: any) {
    if (err.status === 405 || err.status === 409) {
      await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "CONFLICT" } });
      return NextResponse.json(
        { error: "GitHub refused the merge (likely a conflict).", status: "CONFLICT" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: err.message || "Merge failed" }, { status: 502 });
  }

  // Delete the merged branch (best-effort)
  await ctx.octokit.rest.git
    .deleteRef({ owner: ctx.owner, repo: ctx.repo, ref: `heads/${cr.branchName}` })
    .catch(() => {});

  await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "MERGED" } });

  return NextResponse.json({ status: "MERGED" });
}
