import prisma from "../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("Received POST request");

    const body = await req.json();
    console.log("Request body:", body);

    if (!body || typeof body !== "object") {
      throw new Error("Invalid request body");
    }

    const { groupId, senderId, senderName, content } = body;

    if (!groupId || !content) {
      throw new Error("Missing required fields");
    }

    const createdMessage = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId: senderId || "",
        senderName: senderName || "",
        message: content,
        createdAt: new Date(),
      },
    });

    console.log("Created message:", createdMessage);

    return NextResponse.json(createdMessage, { status: 201 });
  } catch (error) {
    console.error("Error in POST function:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
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
      { status: 500 }
    );
  }
}
