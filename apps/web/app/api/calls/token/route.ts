import { NextResponse } from "next/server";
import { createLiveKitToken } from "../../../lib/livekit";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomName, identity } = await req.json();
  if (!roomName || !identity) {
    return NextResponse.json({ error: "roomName and identity required" }, { status: 400 });
  }

  if (identity !== session.user.id) {
    return NextResponse.json({ error: "Identity mismatch" }, { status: 403 });
  }

  try {
    const token = await createLiveKitToken(identity, roomName);
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
