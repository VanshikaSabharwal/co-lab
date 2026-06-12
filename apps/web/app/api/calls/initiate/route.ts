import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { createLiveKitToken, ensureLiveKitRoom } from "../../../lib/livekit";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, targetId, groupId } = await req.json();

  if (!type || (!targetId && !groupId)) {
    return NextResponse.json({ error: "type and targetId or groupId required" }, { status: 400 });
  }

  if (!["AUDIO", "VIDEO", "GROUP"].includes(type)) {
    return NextResponse.json({ error: "Invalid call type" }, { status: 400 });
  }

  try {
    const roomName = `call-${crypto.randomUUID()}`;

    await ensureLiveKitRoom(roomName);

    const callRoom = await prisma.callRoom.create({
      data: {
        livekitRoom: roomName,
        type: type as any,
        status: "RINGING",
        initiatorId: session.user.id,
        groupId: groupId || null,
        participants: {
          create: [
            { userId: session.user.id },
            ...(targetId ? [{ userId: targetId }] : []),
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    const token = await createLiveKitToken(session.user.id, roomName);

    return NextResponse.json({
      callRoom,
      token,
      roomName,
    }, { status: 201 });
  } catch (error) {
    console.error("Call initiation error:", error);
    return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
  }
}
