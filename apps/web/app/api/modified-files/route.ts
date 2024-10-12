import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function POST(req: Request) {
  const { name, path, userId, content, group } = await req.json();
  try {
    const modifiedFile = await prisma.modifiedFiles.upsert({
      where: { userId },
      update: {
        content,
        updatedAt: new Date(),
        userId,
        groupId: group,
      },
      create: {
        name,
        path,
        content,
        userId,
        modifiedById: userId,
        groupId: group,
      },
    });
    return NextResponse.json(modifiedFile, { status: 200 });
  } catch (error) {
    console.error("Error saving file: ", error);
    return NextResponse.json({ Error: "Failed to save file" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const group = searchParams.get("group");

  if (!userId) {
    return NextResponse.json({ Error: "UserId required" }, { status: 400 });
  }

  if (!group) {
    return NextResponse.json({ Error: "Group required" }, { status: 400 });
  }
  try {
    const modifiedFileData = await prisma.modifiedFiles.findFirst({
      where: {
        OR: [{ userId: userId }, { group: { ownerId: userId } }],
      },
      select: {
        userId: true,
        group: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!modifiedFileData) {
      return NextResponse.json(
        { Error: "No modified file found" },
        { status: 404 }
      );
    }

    if (
      userId === modifiedFileData?.userId ||
      userId === modifiedFileData?.group.ownerId
    ) {
      const modifiedFile = await prisma.modifiedFiles.findFirst({
        where: {
          groupId: group,
          OR: [{ userId: userId }, { group: { ownerId: userId } }],
        },
      });
      return NextResponse.json(modifiedFile, { status: 200 });
    } else {
      return NextResponse.json({ Error: "Access denied" }, { status: 403 });
    }
  } catch (error) {
    console.error("Error fetching file: ", error);
    return NextResponse.json(
      { Error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
