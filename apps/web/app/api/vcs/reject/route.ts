import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "../../../lib/apiAuth";
import { getRepoContext } from "../../../lib/vcs";

// POST — owner rejects a change request: close the PR, delete the branch,
// mark REJECTED, and notify the author. Body: { changeRequestId, reason? }
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { changeRequestId, reason } = await req.json();
  if (!changeRequestId) {
    return NextResponse.json({ error: "changeRequestId is required" }, { status: 400 });
  }

  const cr = await prisma.changeRequest.findUnique({
    where: { id: changeRequestId },
    select: {
      id: true,
      groupId: true,
      branchName: true,
      prNumber: true,
      status: true,
      title: true,
      authorId: true,
      author: { select: { name: true } },
    },
  });
  if (!cr) return NextResponse.json({ error: "Change request not found" }, { status: 404 });

  const group = await prisma.group.findUnique({
    where: { id: cr.groupId },
    select: { ownerId: true, githubRepo: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.ownerId !== me.id) return forbidden("Only the group owner can reject change requests");

  if (cr.status === "MERGED") {
    return NextResponse.json({ error: "Already merged" }, { status: 400 });
  }

  try {
    const ctx = await getRepoContext(cr.groupId);
    // Close the PR if one is open
    if (cr.prNumber) {
      await ctx.octokit.rest.pulls
        .update({ owner: ctx.owner, repo: ctx.repo, pull_number: cr.prNumber, state: "closed" })
        .catch(() => {});
    }
    // Delete the branch
    await ctx.octokit.rest.git
      .deleteRef({ owner: ctx.owner, repo: ctx.repo, ref: `heads/${cr.branchName}` })
      .catch(() => {});
  } catch (err: any) {
    // Non-fatal — still mark rejected in our DB
    console.error("Reject cleanup failed:", err.message);
  }

  await prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "REJECTED" } });

  // Notify the author via the existing rejectedCr table
  await prisma.rejectedCr.create({
    data: {
      userId: cr.authorId,
      groupId: cr.groupId,
      groupName: group.githubRepo,
      userName: cr.author.name || "",
      message: reason?.trim() || `Your change request "${cr.title}" was rejected.`,
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ status: "REJECTED" });
}
