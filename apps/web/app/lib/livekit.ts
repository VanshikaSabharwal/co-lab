import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_HOST = process.env.LIVEKIT_HOST || "http://localhost:7880";

export async function createLiveKitToken(
  identity: string,
  roomName: string,
  canPublish: boolean = true,
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
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
  const response = await fetch(`${LIVEKIT_HOST}/twirp/livekit.RoomService/CreateRoom`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await createLiveKitToken("server", roomName)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      empty_timeout: 300,
    }),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Failed to create LiveKit room: ${response.statusText}`);
  }
}

export async function deleteLiveKitRoom(roomName: string) {
  const response = await fetch(`${LIVEKIT_HOST}/twirp/livekit.RoomService/DeleteRoom`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await createLiveKitToken("server", roomName)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ room: roomName }),
  });

  if (!response.ok) {
    console.error(`Failed to delete LiveKit room: ${response.statusText}`);
  }
}
