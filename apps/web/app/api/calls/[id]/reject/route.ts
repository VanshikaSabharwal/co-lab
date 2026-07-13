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

    // Only a participant may reject the call
    const isParticipant = callRoom.participants.some((p) => p.userId === session.user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    if (callRoom.status !== "RINGING") {
      return NextResponse.json({ error: "Call is no longer ringing" }, { status: 400 });
    }

    await prisma.callRoom.update({
      where: { id: params.id },
      data: { status: "REJECTED" },
    });

    await deleteLiveKitRoom(callRoom.livekitRoom);

    return NextResponse.json({ message: "Call rejected" }, { status: 200 });
  } catch (error) {
    console.error("Reject call error:", error);
    return NextResponse.json({ error: "Failed to reject call" }, { status: 500 });
  }
}
