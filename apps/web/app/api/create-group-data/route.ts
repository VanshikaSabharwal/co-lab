import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Use an environment variable for the encryption key in production
const ENCRYPTION_KEY_HEX =
  process.env.ENCRYPTION_KEY ||
  "238d654b1ee39c0663cf2bb6602315cdbc48c322b3a06f50a90e92248468b743";

// Convert the hex string into a 32-byte buffer for AES-256 encryption
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
const IV_LENGTH = 16; // AES-256-CBC requires a 16-byte IV

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = ENCRYPTION_KEY as unknown as crypto.CipherKey;

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv as any);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
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

export async function POST(req: Request) {
  try {
    const {
      groupName,
      githubRepo,
      githubOwnerName,
      githubAccessToken,
      sshKey,
      ownerId,
    } = await req.json();

    console.log("📩 Incoming Body:", {
      groupName,
      githubRepo,
      githubOwnerName,
      githubAccessTokenLength: githubAccessToken?.length,
      ownerId,
      sshKeyLength: sshKey?.length,
    });

    if (!groupName)
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 },
      );

    if (!githubRepo)
      return NextResponse.json(
        { error: "GitHub repo is required" },
        { status: 400 },
      );

    if (!githubAccessToken)
      return NextResponse.json(
        { error: "GitHub access token is required" },
        { status: 400 },
      );

    if (!ownerId)
      return NextResponse.json(
        { error: "Owner ID is required" },
        { status: 400 },
      );

    const groupExists = await prisma.group.findFirst({
      where: {
        ownerId,
        ownerName: githubOwnerName,
        githubRepo,
        groupName,
      },
    });

    if (groupExists) {
      return NextResponse.json(
        { error: "Group already exists!" },
        { status: 409 },
      );
    }

    const encryptedAccessToken = encrypt(githubAccessToken);
    const encryptedSshKey = sshKey ? encrypt(sshKey) : null;

    console.log("➡️ Data being saved in DB:", {
      groupName,
      githubRepo,
      ownerName: githubOwnerName,
      ownerId,
      encryptedSshKeyPresent: !!encryptedSshKey,
      encryptedAccessTokenPresent: !!encryptedAccessToken,
    });

    const group = await prisma.group.create({
      data: {
        groupName,
        githubRepo,
        ownerName: githubOwnerName,
        githubAccessToken: encryptedAccessToken,
        sshKey: encryptedSshKey,
        ownerId,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err: any) {
    console.error("🔥 ERROR IN CREATE-GROUP API");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);

    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get("group");

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID parameter is required" },
        { status: 400 },
      );
    }

    // Fetch the group details by group ID
    const groupDetails = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!groupDetails) {
      return NextResponse.json(
        { error: `Group with ID ${groupId} not found` },
        { status: 404 },
      );
    }

    const decryptedAccessToken = decrypt(groupDetails.githubAccessToken);
    const decryptedSshKey = groupDetails.sshKey
      ? decrypt(groupDetails.sshKey)
      : null;

    // Return the group details, including the decrypted tokens
    return NextResponse.json(
      {
        ...groupDetails,
        githubAccessToken: decryptedAccessToken,
        sshKey: decryptedSshKey,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error fetching group:", err);
    return NextResponse.json(
      { error: "Failed to fetch group data" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
