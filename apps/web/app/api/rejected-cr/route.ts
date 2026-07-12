import { NextRequest, NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "../../lib/apiAuth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  try {
    const rejectedNotifications = await prisma.rejectedCr.findMany({
      where: { userId: me.id },
      select: {
        id: true,
        userId: true,
        userName: true,
        groupId: true,
        groupName: true,
        message: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, rejectedNotification: rejectedNotifications },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching rejected CR notifications:", error);
    return NextResponse.json(
      { error: "Error fetching rejected CR notifications!" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { message, userId, groupId, userName, groupName } = await req.json();

  if (!message || !userId || !groupId || !userName || !groupName) {
    return NextResponse.json(
      { error: "All fields are required!" },
      { status: 400 },
    );
  }

  try {
    // Only the group owner can reject a change request (which notifies its author)
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (group.ownerId !== me.id) {
      return forbidden("Only the group owner can reject change requests");
    }

    const notification = await prisma.rejectedCr.create({
      data: {
        userId,
        groupId,
        message,
        groupName,
        userName,
        createdAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (error) {
    console.error("Error creating rejected CR notification:", error);
    return NextResponse.json(
      { error: "Error creating rejected CR notification!" },
      { status: 500 },
    );
  }
}
