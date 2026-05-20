import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function POST(req: Request) {
  const { name, path, userId, content, group } = await req.json();

  if (!name || !path || !userId || !content || !group) {
    return NextResponse.json(
      { Error: "Missing required fields" },
      { status: 400 },
    );
  }

  try {
    const modifiedFile = await prisma.modifiedFiles.upsert({
      where: {
        userId_groupId_path: {
          userId,
          groupId: group,
          path,
        },
      },
      update: {
        name,
        content,
        updatedAt: new Date(),
        modifiedById: userId,
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
    const modifiedFiles = await prisma.modifiedFiles.findMany({
      where: {
        groupId: group,
        OR: [{ userId: userId }, { group: { ownerId: userId } }],
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(modifiedFiles, { status: 200 });
  } catch (error) {
    console.error("Error fetching files: ", error);
    return NextResponse.json(
      { Error: "Failed to fetch files" },
      { status: 500 },
    );
  }
}
