import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { deleteLiveKitRoom } from "../../../../lib/livekit";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const callRoom = await prisma.callRoom.findUnique({
      where: { id: params.id },
      include: { participants: true },
    });

    if (!callRoom) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Only a participant may end the call
    const isParticipant = callRoom.participants.some((p) => p.userId === session.user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    await prisma.callRoom.update({
      where: { id: params.id },
      data: { status: "ENDED", endedAt: new Date() },
    });

    await deleteLiveKitRoom(callRoom.livekitRoom);

    return NextResponse.json({ message: "Call ended" }, { status: 200 });
  } catch (error) {
    console.error("End call error:", error);
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }
}
