import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUserRecord, unauthorized } from "../../lib/apiAuth";

// Helper: find or create a Chat between two users by their ids
async function getOrCreateChat(senderId: string, recipientPhone: string) {
  const recipient = await prisma.user.findUnique({
    where: { phone: recipientPhone },
    select: { id: true },
  });

  if (!recipient) return null;

  // Find existing chat with both users as participants
  const existing = await prisma.chat.findFirst({
    where: {
      AND: [
        { participants: { some: { id: senderId } } },
        { participants: { some: { id: recipient.id } } },
      ],
    },
    select: { id: true },
  });

  if (existing) return { chatDbId: existing.id, senderId, recipientId: recipient.id };

  // Create new chat
  const chat = await prisma.chat.create({
    data: {
      participants: { connect: [{ id: senderId }, { id: recipient.id }] },
    },
    select: { id: true },
  });

  return { chatDbId: chat.id, senderId, recipientId: recipient.id };
}

// POST — save a new message (sender is always the logged-in user)
export async function POST(req: Request) {
  try {
    const me = await getSessionUserRecord();
    if (!me) return unauthorized();
    if (!me.phone) {
      return NextResponse.json({ error: "Set a phone number before messaging" }, { status: 400 });
    }

    const { recipientPhone, content } = await req.json();

    if (!recipientPhone || !content?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const chat = await getOrCreateChat(me.id, recipientPhone);
    if (!chat) {
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
      senderId: me.phone,   // return phone for client matching
      recipientId: recipientPhone,
      isRead: message.isRead,
      createdAt: message.createdAt.getTime(),
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/direct-message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — fetch messages for a chat with the logged-in user, mark their messages as read
export async function GET(req: Request) {
  try {
    const me = await getSessionUserRecord();
    if (!me) return unauthorized();
    if (!me.phone) return NextResponse.json({ messages: [], unreadCount: 0 });

    const { searchParams } = new URL(req.url);
    const recipientPhone = searchParams.get("recipientPhone");

    if (!recipientPhone) {
      return NextResponse.json({ error: "Missing recipientPhone" }, { status: 400 });
    }

    const recipientUser = await prisma.user.findUnique({
      where: { phone: recipientPhone },
      select: { id: true },
    });

    if (!recipientUser) {
      return NextResponse.json({ messages: [], unreadCount: 0 });
    }

    const chat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: me.id } } },
          { participants: { some: { id: recipientUser.id } } },
        ],
      },
      select: { id: true },
    });

    if (!chat) return NextResponse.json({ messages: [], unreadCount: 0 });

    // Count unread messages sent TO the logged-in user (not yet read)
    const unreadCount = await prisma.messages.count({
      where: { chatId: chat.id, recipientId: me.id, isRead: false },
    });

    const messages = await prisma.messages.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages sent to the requesting user as read
    await prisma.messages.updateMany({
      where: { chatId: chat.id, recipientId: me.id, isRead: false },
      data: { isRead: true },
    });

    // Map back to phone numbers for the client
    const formatted = messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId === me.id ? me.phone : recipientPhone,
      recipientId: m.recipientId === me.id ? me.phone : recipientPhone,
      isRead: m.isRead,
      createdAt: m.createdAt.getTime(),
    }));

    return NextResponse.json({ messages: formatted, unreadCount });
  } catch (err) {
    console.error("GET /api/direct-message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — mark all messages sent to the logged-in user in a chat as read
export async function PATCH(req: Request) {
  try {
    const me = await getSessionUserRecord();
    if (!me) return unauthorized();

    const { recipientPhone } = await req.json();

    const recipient = recipientPhone
      ? await prisma.user.findUnique({ where: { phone: recipientPhone }, select: { id: true } })
      : null;

    if (!recipient) return NextResponse.json({ ok: true });

    const chat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: me.id } } },
          { participants: { some: { id: recipient.id } } },
        ],
      },
      select: { id: true },
    });

    if (!chat) return NextResponse.json({ ok: true });

    await prisma.messages.updateMany({
      where: { chatId: chat.id, recipientId: me.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/direct-message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
