import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_HOST = process.env.LIVEKIT_HOST || "http://localhost:7880";

const roomService = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export async function createLiveKitToken(
  identity: string,
  roomName: string,
  canPublish: boolean = true,
  name?: string,
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name,
    ttl: "10m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
  });

  return at.toJwt();
}

export async function ensureLiveKitRoom(roomName: string) {
  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
    });
  } catch (err: any) {
    if (err?.status !== 409) throw err;
  }
}

export async function deleteLiveKitRoom(roomName: string) {
  try {
    await roomService.deleteRoom(roomName);
  } catch (err) {
    console.error("Failed to delete LiveKit room:", err);
  }
}
