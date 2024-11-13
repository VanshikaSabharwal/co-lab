import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import prisma from "../../lib/prisma";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json(
    { message: "Method not allowed. Use POST to commit changes." },
    { status: 405 }
  );
}

// Use an environment variable for the encryption key in production
const ENCRYPTION_KEY_HEX =
  process.env.ENCRYPTION_KEY ||
  "238d654b1ee39c0663cf2bb6602315cdbc48c322b3a06f50a90e92248468b743";

// Convert the hex string into a 32-byte buffer for AES-256 encryption
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

function decrypt(encryptedText: string): string {
  const textParts = encryptedText.split(":");
  const ivHex = textParts.shift(); // Extract IV part
  const encryptedDataHex = textParts.join(":"); // Join the remaining parts

  // Ensure the IV and encrypted data are defined before proceeding
  if (!ivHex || !encryptedDataHex) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encryptedData = Buffer.from(encryptedDataHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf-8");
}
export async function POST(req: NextRequest) {
  try {
    const { userId, modifiedFiles, groupId, message } = await req.json();

    // Validate required parameters
    if (!userId || !modifiedFiles || !groupId || !message) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 }
      );
    }

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
            groupName: true,
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
        { status: 404 }
      );
    }

    if (
      !groupDetails.group.githubAccessToken ||
      groupDetails.group.githubAccessToken.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Invalid GitHub token for the group." },
        { status: 401 }
      );
    }
    console.log(
      "GitHub Access Token:",
      decrypt(groupDetails.group.githubAccessToken)
    );

    // Initialize Octokit with Authorization header
    const octokit = new Octokit({
      auth: decrypt(groupDetails.group.githubAccessToken),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    // Add debugging middleware
    octokit.hook.wrap("request", async (request, options) => {
      console.log("Request headers:", options.headers);
      return request(options);
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
          { status: 403 }
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
          { status: 401 }
        );
      }

      // Handle case where the error is not an instance of Error
      return NextResponse.json(
        {
          error:
            "GitHub authentication failed. Please check your access token.",
          details: "An unknown error occurred.",
        },
        { status: 401 }
      );
    }

    // Step 1: Get the latest SHA for the default branch (main)
    const { data } = await octokit.rest.repos.getBranch({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.groupName,
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
      repo: groupDetails.group.groupName,
      tree: treeEntries,
      base_tree: baseTreeSha,
    });

    // Step 3: Create a new commit with the new tree
    // const commitMessage = "Updated files";
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.groupName,
      message: message,
      tree: newTree.sha,
      parents: [baseTreeSha],
    });

    // Step 4: Update the default branch with the new commit
    await octokit.rest.git.updateRef({
      owner: groupDetails.group.ownerName,
      repo: groupDetails.group.groupName,
      ref: "heads/main",
      sha: commit.sha,
    });

    const commitUrl = `https://github.com/${groupDetails.group.ownerName}/${groupDetails.group.groupName}/commit/${commit.sha}`;

    return NextResponse.json(
      { message: "Changes committed successfully!", commitUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error committing changes:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to commit changes: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while committing changes." },
      { status: 500 }
    );
  }
}
