import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, path, userId, content, group } = await req.json();

    if (!name || !path || !content || !group || !userId) {
      return NextResponse.json(
        { error: "File name, path, content, group, and userId are required" },
        { status: 400 }
      );
    }

    const existingFile = await prisma.file.findUnique({
      where: { userId },
    });

    if (existingFile) {
      // Update the existing file and set status to PENDING
      await prisma.file.update({
        where: { userId },
        data: {
          content,
          group,
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(
        { message: "File updated successfully" },
        { status: 200 }
      );
    } else {
      // Create a new file and set status to PENDING
      await prisma.file.create({
        data: {
          name,
          userId,
          path,
          content,
          group,
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(
        { message: "File saved successfully" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error while saving code files: ", error);
    return NextResponse.json(
      { error: "Error while saving code files" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const group = searchParams.get("group");

  if (!userId || !group) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    const updatedFiles = await prisma.file.findMany({
      where: {
        userId,
        status: "PENDING",
      },
    });
    return NextResponse.json(updatedFiles, { status: 200 });
  } catch (error) {
    console.error("Error fetching updated files: ", error);
    return NextResponse.json(
      { error: "Failed to fetch updated files" },
      { status: 500 }
    );
  }
}
