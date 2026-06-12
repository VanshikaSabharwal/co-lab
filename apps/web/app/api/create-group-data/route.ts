import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../../lib/encryption";

const prisma = new PrismaClient();

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

    // Validate token by calling GitHub API before storing
    try {
      const testRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!testRes.ok) {
        const err = await testRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: `GitHub token is invalid: ${err.message || testRes.statusText}. Try reconnecting your GitHub account or use a valid PAT.`,
          },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to verify GitHub token. Check your network." },
        { status: 502 },
      );
    }

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

    let decryptedAccessToken: string;
    let decryptedSshKey: string | null = null;
    try {
      decryptedAccessToken = decrypt(groupDetails.githubAccessToken);
      decryptedSshKey = groupDetails.sshKey ? decrypt(groupDetails.sshKey) : null;
    } catch {
      // Token may be stored unencrypted (legacy data) — return as-is
      decryptedAccessToken = groupDetails.githubAccessToken;
      decryptedSshKey = groupDetails.sshKey ?? null;
    }

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

export async function DELETE(req: Request) {
  try {
    const { groupId, userId } = await req.json();

    if (!groupId || !userId) {
      return NextResponse.json(
        { error: "Group ID and User ID are required" },
        { status: 400 },
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 },
      );
    }

    if (group.ownerId !== userId) {
      return NextResponse.json(
        { error: "Only the group owner can delete this group" },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.change.deleteMany({
        where: { file: { groupId } },
      });

      await tx.modifiedFiles.deleteMany({ where: { groupId } });

      await tx.groupMember.deleteMany({ where: { groupId } });

      await tx.groupMessage.deleteMany({ where: { groupId } });

      await tx.invite.deleteMany({ where: { groupId } });

      await tx.notifications.deleteMany({ where: { groupId } });

      await tx.rejectedCr.deleteMany({ where: { groupId } });

      await tx.approvedCr.deleteMany({ where: { groupId } });

      await tx.guestGroup.deleteMany({ where: { groupId } });

      await tx.callRoom.deleteMany({ where: { groupId } });

      await tx.file.deleteMany({ where: { group: groupId } });

      await tx.group.delete({ where: { id: groupId } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting group:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to delete group" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
