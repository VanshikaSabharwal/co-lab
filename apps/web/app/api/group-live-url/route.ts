import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { groupId, liveUrl, userId } = await req.json();

    if (!groupId || liveUrl === undefined || !userId) {
      return NextResponse.json(
        { error: "groupId, liveUrl, and userId are required" },
        { status: 400 },
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId !== userId) {
      return NextResponse.json(
        { error: "Only the group owner can update the live URL" },
        { status: 403 },
      );
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: { liveUrl: liveUrl || null },
    });

    return NextResponse.json({ liveUrl: updated.liveUrl }, { status: 200 });
  } catch (error) {
    console.error("Error updating live URL:", error);
    return NextResponse.json(
      { error: "Failed to update live URL" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json(
      { error: "groupId is required" },
      { status: 400 },
    );
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { liveUrl: true, ownerId: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(
      { liveUrl: group.liveUrl, ownerId: group.ownerId },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching live URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch live URL" },
      { status: 500 },
    );
  }
}
