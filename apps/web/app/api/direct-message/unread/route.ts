import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

// GET /api/direct-message/unread?phone=<myPhone>
// Returns list of senders who have unread messages for this user, with count + last message
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const myPhone = searchParams.get("phone");

    if (!myPhone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const me = await prisma.user.findUnique({
      where: { phone: myPhone },
      select: { id: true },
    });

    if (!me) return NextResponse.json({ unread: [] });

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
