import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { decrypt, extractRepoName } from "../../lib/encryption";

async function fetchAllFiles(
  owner: string,
  repo: string,
  token: string,
  path: string = "",
): Promise<any[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
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
      msg = "GitHub token is invalid or expired. Try creating the group again with a fresh token.";
    } else if (status === 403) {
      msg = `GitHub token lacks permission. Ensure it has 'repo' scope.`;
    } else if (status === 404) {
      msg = `Repo not found at ${owner}/${repo}. Check owner name and repo name.`;
    }
    throw new Error(msg);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [data];
  }

  const files: any[] = [];
  for (const item of data) {
    if (item.type === "file") {
      files.push(item);
    } else if (item.type === "dir") {
      const subFiles = await fetchAllFiles(owner, repo, token, item.path);
      files.push(...subFiles);
    }
  }
  return files;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");

  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 },
    );
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

    const allFiles = await fetchAllFiles(
      ownerName,
      githubRepo,
      decryptedAccessToken,
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
