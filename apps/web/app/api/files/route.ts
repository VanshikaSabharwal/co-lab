import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { decrypt, extractRepoName } from "../../lib/encryption";
import { getSessionUser, isGroupMember, unauthorized, forbidden } from "../../lib/apiAuth";

// Lists the whole repo in ONE call via the git-trees API (recursive), rather
// than one contents request per directory — much faster on big repos.
async function fetchTree(
  owner: string,
  repo: string,
  token: string,
  ref: string,
): Promise<any[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
    ref,
  )}?recursive=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const status = response.status;
    let msg = error.message || response.statusText;
    if (status === 401) {
      msg = "GitHub token is invalid or expired. Reconnect GitHub or recreate the group.";
    } else if (status === 403) {
      msg = `GitHub token lacks permission. Ensure it has 'repo' scope.`;
    } else if (status === 404) {
      msg = `Repo or branch not found (${owner}/${repo}@${ref}).`;
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const tree: any[] = Array.isArray(data.tree) ? data.tree : [];

  // Only blobs (files); shape them like the editor expects
  return tree
    .filter((n) => n.type === "blob")
    .map((n) => ({
      name: n.path.split("/").pop(),
      path: n.path,
      sha: n.sha,
      size: n.size,
      type: "file",
    }));
}

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");
  const ref = searchParams.get("ref"); // optional branch; defaults to repo default

  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 },
    );
  }

  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }

  try {
    const groupDetails = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        githubRepo: true,
        ownerName: true,
        githubAccessToken: true,
      },
    });

    if (!groupDetails) {
      return NextResponse.json(
        { error: `Group with ID ${groupId} not found` },
        { status: 404 },
      );
    }

    let { githubRepo, ownerName, githubAccessToken } = groupDetails;

    if (!githubRepo || !ownerName || !githubAccessToken) {
      return NextResponse.json(
        {
          error:
            "GitHub repository URL, owner name, or access token is missing",
        },
        { status: 400 },
      );
    }

    githubRepo = extractRepoName(githubRepo);
    let decryptedAccessToken: string;
    try {
      decryptedAccessToken = decrypt(githubAccessToken);
    } catch {
      decryptedAccessToken = githubAccessToken;
    }

    // Resolve the ref: explicit branch, else the repo's default branch
    let branch = ref;
    if (!branch) {
      const repoRes = await fetch(
        `https://api.github.com/repos/${ownerName}/${githubRepo}`,
        {
          headers: {
            Authorization: `token ${decryptedAccessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );
      if (repoRes.ok) branch = (await repoRes.json()).default_branch;
    }

    const allFiles = await fetchTree(
      ownerName,
      githubRepo,
      decryptedAccessToken,
      branch || "HEAD",
    );

    return NextResponse.json(allFiles, { status: 200 });
  } catch (err) {
    console.error("Error fetching group or GitHub repo: ", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch group or GitHub repository",
      },
      { status: 500 },
    );
  }
}
