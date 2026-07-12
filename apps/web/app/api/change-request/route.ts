import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUserRecord, isGroupMember, unauthorized, forbidden } from "../../lib/apiAuth";

export async function POST(req: Request) {
  const me = await getSessionUserRecord();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");

  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 },
    );
  }

  const { message } = await req.json();

  try {
    if (!(await isGroupMember(groupId, me.id))) {
      return forbidden("Not a member of this group");
    }

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
    const groupName = groupData.githubRepo;

    const notification = await prisma.notifications.create({
      data: {
        userId: me.id,
        groupId: groupId,
        ownerId: ownerId,
        ownerName: ownerName,
        userName: me.name || "Unknown",
        groupName: groupName,
        message: message || "",
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, notification, userId: me.id, ownerId, ownerName, groupName },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating change request notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 },
    );
  }
}
