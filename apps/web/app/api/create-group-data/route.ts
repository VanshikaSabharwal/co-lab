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

// Helper function to encrypt text
function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a random Initialization Vector (IV)
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf-8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return IV and encrypted text as a combined string
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Helper function to decrypt text
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

export async function POST(req: Request) {
  try {
    const {
      groupName,
      githubRepo,
      githubOwnerName,
      githubAccessToken,
      ownerId,
    } = await req.json();

    if (!groupName || !githubRepo || !githubAccessToken || !ownerId) {
      return NextResponse.json(
        {
          error:
            "Group name, GitHub repo URL, GitHub access token, and owner ID are required",
        },
        { status: 400 }
      );
    }

    // Check if the group already exists in the database
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
        {
          error:
            "A group with the same owner, group name, and GitHub repo already exists.",
        },
        { status: 409 }
      );
    }

    // Encrypt the GitHub access token before storing it in the database
    const encryptedAccessToken = encrypt(githubAccessToken);

    // Create a new group and store it in the database
    const group = await prisma.group.create({
      data: {
        groupName,
        githubRepo,
        ownerName: githubOwnerName,
        githubAccessToken: encryptedAccessToken,
        ownerId,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("Error while creating group:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
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
        { status: 400 }
      );
    }

    // Fetch the group details by group ID
    const groupDetails = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!groupDetails) {
      return NextResponse.json(
        { error: `Group with ID ${groupId} not found` },
        { status: 404 }
      );
    }

    // Decrypt the GitHub access token before sending it back
    const decryptedAccessToken = decrypt(groupDetails.githubAccessToken);

    // Return the group details, including the decrypted access token
    return NextResponse.json(
      { ...groupDetails, githubAccessToken: decryptedAccessToken },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching group:", err);
    return NextResponse.json(
      { error: "Failed to fetch group data" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
