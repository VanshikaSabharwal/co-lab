import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "No userId" }, { status: 400 });
  }

  try {
    // Fetch notifications where userId is equal to ownerId
    const notifications = await prisma.notifications.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        // Select only the necessary fields
        groupId: true,
        groupName: true,
        userId: true,
        userName: true,
      },
      orderBy: { createdAt: "desc" }, // Optional: Order notifications by creation date
    });

    // If no notifications are found, return an empty array
    if (notifications.length === 0) {
      return NextResponse.json(
        { success: true, notifications: [] },
        { status: 200 }
      );
    }

    // Return the notifications
    return NextResponse.json({ success: true, notifications }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Error while sending notification" },
      { status: 500 }
    );
  }
}
