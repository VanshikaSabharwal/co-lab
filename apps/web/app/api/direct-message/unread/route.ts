import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized } from "../../../lib/apiAuth";

// GET /api/direct-message/unread
// Returns list of senders who have unread messages for the logged-in user, with count + last message
export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    // Find all unread messages sent to me
    const unreadMessages = await prisma.messages.findMany({
      where: { recipientId: me.id, isRead: false },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { name: true, phone: true } },
      },
    });

    // Group by sender
    const byPhone = new Map<string, { name: string; phone: string; count: number; lastMessage: string; lastAt: number }>();
    for (const msg of unreadMessages) {
      const senderPhone = msg.sender.phone || "";
      const existing = byPhone.get(senderPhone);
      if (!existing) {
        byPhone.set(senderPhone, {
          name: msg.sender.name || senderPhone,
          phone: senderPhone,
          count: 1,
          lastMessage: msg.content,
          lastAt: msg.createdAt.getTime(),
        });
      } else {
        existing.count++;
        // Already ordered desc so first encountered is latest
      }
    }

    return NextResponse.json({ unread: Array.from(byPhone.values()) });
  } catch (err) {
    console.error("GET /api/direct-message/unread error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
