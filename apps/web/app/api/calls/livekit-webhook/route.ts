import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import prisma from "../../../lib/prisma";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

export async function POST(req: Request) {
  // LiveKit signs webhooks with a JWT in the Authorization header —
  // reject anything that doesn't verify against our API secret.
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  let body: { event?: string; room?: any; participant?: any };
  try {
    const rawBody = await req.text();
    body = (await receiver.receive(rawBody, authHeader)) as typeof body;
  } catch (err) {
    console.error("LiveKit webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

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
