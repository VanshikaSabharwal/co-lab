import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import crypto from "crypto";

const prisma = new PrismaClient();

// Use the same encryption key you used while encrypting
const ENCRYPTION_KEY_HEX =
  process.env.ENCRYPTION_KEY ||
  "238d654b1ee39c0663cf2bb6602315cdbc48c322b3a06f50a90e92248468b743";
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

// Helper function to decrypt the GitHub access token
function decrypt(encryptedText: string): string {
  const textParts = encryptedText.split(":");
  const ivHex = textParts.shift();
  const encryptedDataHex = textParts.join(":");

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");

  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 }
    );
  }

  try {
    // Retrieve the group details from the database
    const groupDetails = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        groupName: true,
        ownerName: true,
        ownerId: true,
        githubAccessToken: true,
      },
    });

    // Check if the group exists
    if (!groupDetails) {
      return NextResponse.json(
        { error: `Group with ID ${groupId} not found` },
        { status: 404 }
      );
    }

    const { groupName, ownerName, githubAccessToken } = groupDetails;

    if (!groupName || !ownerName || !githubAccessToken) {
      return NextResponse.json(
        {
          error:
            "GitHub repository URL, owner name, or access token is missing",
        },
        { status: 400 }
      );
    }

    const decryptedAccessToken = decrypt(githubAccessToken);

    const githubApiUrl = `https://api.github.com/repos/${ownerName}/${groupName}/contents`;

    const response = await fetch(githubApiUrl, {
      headers: {
        Authorization: `token ${decryptedAccessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("GitHub API Error: ", error);
      return NextResponse.json(
        { error: `Failed to fetch GitHub repo: ${error.message}` },
        { status: response.status }
      );
    }

    const repoContents = await response.json();

    return NextResponse.json(repoContents, { status: 200 });
  } catch (err) {
    console.error("Error fetching group or GitHub repo: ", err);
    return NextResponse.json(
      { error: "Failed to fetch group or GitHub repository" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
