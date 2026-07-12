import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, unauthorized } from "../../lib/apiAuth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  try {
    // Fetch notifications where the logged-in user is the owner
    const notifications = await prisma.notifications.findMany({
      where: {
        ownerId: me.id,
      },
      select: {
        // Select only the necessary fields
        groupId: true,
        groupName: true,
        userId: true,
        userName: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // If no notifications are found, return an empty array
    if (notifications.length === 0) {
      return NextResponse.json(
        { success: true, notifications: [] },
        { status: 200 },
      );
    }

    // Return the notifications
    return NextResponse.json({ success: true, notifications }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Error while sending notification" },
      { status: 500 },
    );
  }
}
