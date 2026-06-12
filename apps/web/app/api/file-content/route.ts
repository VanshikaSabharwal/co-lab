import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { decrypt, extractRepoName } from "../../lib/encryption";

export async function POST(req: Request) {
  try {
    const { groupId, filePath } = await req.json();

    if (!groupId || !filePath) {
      return NextResponse.json(
        { error: "groupId and filePath are required" },
        { status: 400 },
      );
    }

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
        { error: "GitHub repository URL, owner name, or access token is missing" },
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

    const url = `https://api.github.com/repos/${ownerName}/${githubRepo}/contents/${filePath}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${decryptedAccessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || response.statusText);
    }

    const data = await response.json();
    const content =
      data.encoding === "base64"
        ? Buffer.from(data.content, "base64").toString("utf-8")
        : data.content;

    return NextResponse.json({ content }, { status: 200 });
  } catch (err) {
    console.error("Error fetching file content: ", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch file content",
      },
      { status: 500 },
    );
  }
}
