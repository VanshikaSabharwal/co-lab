import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(req: Request) {
  const { name, path, content, userId, group } = await req.json();

  // Validate required fields
  if (!name || !path || !content || !userId || !group) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  try {
    const existingFile = await prisma.modifiedFiles.findFirst({
      where: {
        name,
        path,
        userId,
        groupId: group,
      },
    });

    if (existingFile) {
      // Update the existing file
      await prisma.modifiedFiles.update({
        where: { id: existingFile.id },
        data: {
          content,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create a new file
      await prisma.modifiedFiles.create({
        data: {
          name,
          path,
          content,
          userId,
          groupId: group,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    return NextResponse.json(
      { message: "File saved successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error saving file:", err);
    return NextResponse.json(
      { error: "Internal Server Error!" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("group");
    const userId = searchParams.get("userId");

    // Validate query parameters
    if (!groupId || !userId) {
      return NextResponse.json(
        { error: "Missing group or user ID" },
        { status: 400 }
      );
    }

    // Fetch group and members
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is either owner or member of the group
    const isOwner = group.ownerId === userId;
    const isMember = group.members.some((member) => member.id === userId);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Forbidden. You are not allowed to view the modified files." },
        { status: 403 }
      );
    }

    // Fetch modified files for the group
    const modifiedFiles = await prisma.modifiedFiles.findMany({
      where: { groupId },
    });

    return NextResponse.json({ modifiedFiles }, { status: 200 });
  } catch (err) {
    console.error("Error fetching files:", err);
    return NextResponse.json(
      { error: "Internal Server Error!" },
      { status: 500 }
    );
  }
}
