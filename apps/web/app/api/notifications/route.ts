import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, unauthorized } from "../../lib/apiAuth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  try {
    // Anything addressed to this user, either as the group owner being told
    // about activity or as the subject of the notification.
    //
    // This used to filter on ownerId alone, so a notification aimed at a member
    // — "you were added to X" — was written to the table and then never shown
    // to anyone but the owner.
    const notifications = await prisma.notifications.findMany({
      where: {
        OR: [
          // Addressed explicitly to this user.
          { recipientId: me.id },
          // Legacy rows predate recipientId and were implicitly owner-scoped,
          // so the owner still sees them. Excluded once a recipient is set,
          // otherwise an owner would get a second copy of everything they
          // addressed to someone else.
          { recipientId: null, ownerId: me.id },
        ],
      },
      select: {
        id: true,
        groupId: true,
        groupName: true,
        userId: true,
        userName: true,
        ownerId: true,
        recipientId: true,
        type: true,
        message: true,
        readAt: true,
        createdAt: true,
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
