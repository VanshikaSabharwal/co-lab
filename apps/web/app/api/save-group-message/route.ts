import prisma from "../../lib/prisma";
import { NextResponse } from "next/server";
import { getSessionUserRecord, isGroupMember, unauthorized, forbidden } from "../../lib/apiAuth";

export async function POST(req: Request) {
  try {
    const me = await getSessionUserRecord();
    if (!me) return unauthorized();

    const body = await req.json();

    if (!body || typeof body !== "object") {
      throw new Error("Invalid request body");
    }

    const { groupId, content } = body;

    if (!groupId || !content) {
      throw new Error("Missing required fields");
    }

    if (!(await isGroupMember(groupId, me.id))) {
      return forbidden("Not a member of this group");
    }

    const createdMessage = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId: me.id,
        senderName: me.name || "",
        message: content,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(createdMessage, { status: 201 });
  } catch (error) {
    console.error("Error in POST function:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const me = await getSessionUserRecord();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }

  try {
    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId: groupId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const formattedMessages = messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      groupId: message.groupId,
      content: message.message,
      createdAt: message.createdAt.getTime(),
    }));

    return NextResponse.json(formattedMessages, { status: 200 });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json(
      { error: "Failed to retrieve messages" },
      { status: 500 },
    );
  }
}
