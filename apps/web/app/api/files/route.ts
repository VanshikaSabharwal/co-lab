import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import crypto from "crypto";

const ENCRYPTION_KEY_HEX =
  process.env.ENCRYPTION_KEY ||
  "238d654b1ee39c0663cf2bb6602315cdbc48c322b3a06f50a90e92248468b743";

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
const IV_LENGTH = 16;

function extractRepoName(repo: string): string {
  const urlMatch = repo.match(/github\.com\/[^/]+\/([^/]+?)(?:\.git)?$/);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  const parts = repo.replace(/\.git$/, "").split("/");
  return parts[parts.length - 1] || repo;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid encrypted text format");
  }

  const [ivHex, encryptedData] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const key = ENCRYPTION_KEY as unknown as crypto.CipherKey;

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv as any);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

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
    const error = await response.json();
    throw new Error(
      `GitHub API: ${error.message || response.statusText}`,
    );
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
    const decryptedAccessToken = decrypt(githubAccessToken);

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
