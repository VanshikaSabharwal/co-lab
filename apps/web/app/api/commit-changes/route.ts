import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import prisma from "../../lib/prisma";
import { decrypt } from "../../lib/encryption";
import { getSessionUser, unauthorized, requireCodeAccess } from "../../lib/apiAuth";

export async function GET() {
  return NextResponse.json(
    { message: "Method not allowed. Use POST to commit changes." },
    { status: 405 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();
    const userId = me.id;

    const { modifiedFiles, groupId, message } = await req.json();

    // Validate required parameters
    if (!modifiedFiles || !groupId || !message) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 },
      );
    }

    // This route commits with the OWNER's token, so GitHub's own permission
    // check never fires for the caller — code access must be enforced here.
    const gate = await requireCodeAccess(groupId, userId);
    if (!gate.ok) return gate.res;

    // Fetch group details and access token
    const groupDetails = await prisma.modifiedFiles.findFirst({
      where: {
        groupId,
        OR: [{ userId }, { group: { ownerId: userId } }],
      },
      select: {
        userId: true,
        group: {
          select: {
            githubRepo: true,
            ownerName: true,
            ownerId: true,
            githubAccessToken: true,
          },
        },
      },
    });

    if (!groupDetails) {
      return NextResponse.json(
        { error: "No modified file found" },
        { status: 404 },
      );
    }

    if (
      !groupDetails.group.githubAccessToken ||
      groupDetails.group.githubAccessToken.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Invalid GitHub token for the group." },
        { status: 401 },
      );
    }
    // Initialize Octokit with Authorization header
    const octokit = new Octokit({
      auth: decrypt(groupDetails.group.githubAccessToken),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    // Verify GitHub token and check scopes
    try {
      const { data, headers } = await octokit.rest.users.getAuthenticated();
      console.log("Authenticated as:", data.login);
      console.log("Rate limit remaining:", headers["x-ratelimit-remaining"]);

      // Check token scopes
      const scopes = headers["x-oauth-scopes"]?.split(", ") || [];
      console.log("Token scopes:", scopes);

      if (!scopes.includes("repo")) {
        return NextResponse.json(
          {
            error: "The GitHub token does not have the required 'repo' scope.",
          },
          { status: 403 },
        );
      }
    } catch (error: unknown) {
      console.error("GitHub authentication failed:", error);

      // Type guard to check if error is an instance of Error
      if (error instanceof Error) {
        return NextResponse.json(
          {
            error:
              "GitHub authentication failed. Please check your access token.",
            details: error.message,
          },
          { status: 401 },
        );
      }

      // Handle case where the error is not an instance of Error
      return NextResponse.json(
        {
          error:
            "GitHub authentication failed. Please check your access token.",
          details: "An unknown error occurred.",
        },
        { status: 401 },
      );
    }

    // Step 1: Get the latest SHA for the default branch (main)
    const { data } = await octokit.rest.repos.getBranch({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.githubRepo,
      branch: "main",
    });

    const baseTreeSha = data.commit.sha;

    // Step 2: Create a new tree with the modified files
    const treeEntries = modifiedFiles.map((file: any) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      content: Buffer.from(file.content, "base64").toString(),
    }));

    const { data: newTree } = await octokit.rest.git.createTree({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.githubRepo,
      tree: treeEntries,
      base_tree: baseTreeSha,
    });

    // Step 3: Create a new commit with the new tree
    // const commitMessage = "Updated files";
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.githubRepo,
      message: message,
      tree: newTree.sha,
      parents: [baseTreeSha],
    });

    // Step 4: Update the default branch with the new commit
    await octokit.rest.git.updateRef({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.githubRepo,
      ref: "heads/main",
      sha: commit.sha,
    });

    const commitUrl = `https://github.com/${groupDetails.group.ownerName}/${groupDetails.group.githubRepo}/commit/${commit.sha}`;

    return NextResponse.json(
      { message: "Changes committed successfully!", commitUrl },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error committing changes:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to commit changes: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while committing changes." },
      { status: 500 },
    );
  }
}
