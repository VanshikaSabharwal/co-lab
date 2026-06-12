import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const { event, room, participant } = body;

  if (!event || !room) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    const callRoom = await prisma.callRoom.findUnique({
      where: { livekitRoom: room.name },
    });

    if (!callRoom) {
      return NextResponse.json({ error: "Call room not found" }, { status: 404 });
    }

    switch (event) {
      case "participant_joined": {
        if (participant?.identity) {
          await prisma.callParticipant.updateMany({
            where: {
              callId: callRoom.id,
              userId: participant.identity,
            },
            data: { joinedAt: new Date() },
          });
        }
        break;
      }

      case "participant_left": {
        if (participant?.identity) {
          await prisma.callParticipant.updateMany({
            where: {
              callId: callRoom.id,
              userId: participant.identity,
            },
            data: { leftAt: new Date() },
          });
        }
        break;
      }

      case "room_finished": {
        if (callRoom.status === "ONGOING") {
          await prisma.callRoom.update({
            where: { id: callRoom.id },
            data: { status: "ENDED", endedAt: new Date() },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
