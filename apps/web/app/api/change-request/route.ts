import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");

  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 }
    );
  }

  const { userId, userName } = await req.json();

  try {
    // Fetch group information to get ownerId and ownerName
    const groupData = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: true,
      },
    });

    if (!groupData) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const ownerId = groupData.ownerId;
    const ownerName = groupData.ownerName;
    const groupName = groupData.groupName;

    // Create a notification for the owner
    const notification = await prisma.notifications.create({
      data: {
        userId: userId,
        groupId: groupId,
        ownerId: ownerId,
        ownerName: ownerName,
        userName: userName,
        groupName: groupName,
        createdAt: new Date(),
      },
    });

    // Return success response with required data
    return NextResponse.json(
      { success: true, notification, userId, ownerId, ownerName, groupName },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating change request notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
