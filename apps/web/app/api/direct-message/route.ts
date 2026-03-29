import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

// Helper: find or create a Chat between two users by their phone numbers
async function getOrCreateChat(senderPhone: string, recipientPhone: string) {
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { phone: senderPhone }, select: { id: true } }),
    prisma.user.findUnique({ where: { phone: recipientPhone }, select: { id: true } }),
  ]);

  if (!sender || !recipient) return null;

  // Find existing chat with both users as participants
  const existing = await prisma.chat.findFirst({
    where: {
      AND: [
        { participants: { some: { id: sender.id } } },
        { participants: { some: { id: recipient.id } } },
      ],
    },
    select: { id: true },
  });

  if (existing) return { chatDbId: existing.id, senderId: sender.id, recipientId: recipient.id };

  // Create new chat
  const chat = await prisma.chat.create({
    data: {
      participants: { connect: [{ id: sender.id }, { id: recipient.id }] },
    },
    select: { id: true },
  });

  return { chatDbId: chat.id, senderId: sender.id, recipientId: recipient.id };
}

// POST — save a new message
export async function POST(req: Request) {
  try {
    const { senderPhone, recipientPhone, content } = await req.json();

    console.log("[DM POST] senderPhone:", senderPhone, "recipientPhone:", recipientPhone, "content length:", content?.length);

    if (!senderPhone || !recipientPhone || !content?.trim()) {
      console.log("[DM POST] Missing fields");
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const chat = await getOrCreateChat(senderPhone, recipientPhone);
    console.log("[DM POST] getOrCreateChat result:", chat);
    if (!chat) {
      console.log("[DM POST] Users not found by phone. Check if phone is set in User table.");
      return NextResponse.json({ error: "Users not found — make sure both users have a phone number set" }, { status: 404 });
    }

    const message = await prisma.messages.create({
      data: {
        chatId: chat.chatDbId,
        senderId: chat.senderId,
        recipientId: chat.recipientId,
        content,
        isRead: false,
      },
    });

    return NextResponse.json({
      id: message.id,
      content: message.content,
      senderId: senderPhone,   // return phone for client matching
      recipientId: recipientPhone,
      isRead: message.isRead,
      createdAt: message.createdAt.getTime(),
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/direct-message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — fetch messages for a chat, mark recipient's messages as read
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const senderPhone = searchParams.get("senderPhone");
    const recipientPhone = searchParams.get("recipientPhone");

    if (!senderPhone || !recipientPhone) {
      return NextResponse.json({ error: "Missing phones" }, { status: 400 });
    }

    const [senderUser, recipientUser] = await Promise.all([
      prisma.user.findUnique({ where: { phone: senderPhone }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone: recipientPhone }, select: { id: true } }),
    ]);

    if (!senderUser || !recipientUser) {
      return NextResponse.json({ messages: [], unreadCount: 0 });
    }

    const chat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: senderUser.id } } },
          { participants: { some: { id: recipientUser.id } } },
        ],
      },
      select: { id: true },
    });

    if (!chat) return NextResponse.json({ messages: [], unreadCount: 0 });

    // Count unread messages sent TO senderPhone (i.e. from recipientPhone, not yet read)
    const unreadCount = await prisma.messages.count({
      where: { chatId: chat.id, recipientId: senderUser.id, isRead: false },
    });

    const messages = await prisma.messages.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages sent to the requesting user as read
    await prisma.messages.updateMany({
      where: { chatId: chat.id, recipientId: senderUser.id, isRead: false },
      data: { isRead: true },
    });

    // Map back to phone numbers for the client
    const formatted = messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId === senderUser.id ? senderPhone : recipientPhone,
      recipientId: m.recipientId === senderUser.id ? senderPhone : recipientPhone,
      isRead: m.isRead,
      createdAt: m.createdAt.getTime(),
    }));

    return NextResponse.json({ messages: formatted, unreadCount });
  } catch (err) {
    console.error("GET /api/direct-message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — mark all messages in a chat as read (called by recipient on open)
export async function PATCH(req: Request) {
  try {
    const { senderPhone, recipientPhone } = await req.json();

    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { phone: senderPhone }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone: recipientPhone }, select: { id: true } }),
    ]);

    if (!sender || !recipient) return NextResponse.json({ ok: true });

    const chat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: sender.id } } },
          { participants: { some: { id: recipient.id } } },
        ],
      },
      select: { id: true },
    });

    if (!chat) return NextResponse.json({ ok: true });

    await prisma.messages.updateMany({
      where: { chatId: chat.id, recipientId: sender.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/direct-message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/direct-message/unread — fetch unread DM notifications for a user
// Used by notifications page — call as /api/direct-message?unreadFor=<phone>
