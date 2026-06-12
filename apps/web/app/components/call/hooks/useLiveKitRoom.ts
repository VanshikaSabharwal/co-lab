"use client";

import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

export function useLiveKitRoom(token: string | null, roomName: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !roomName) return;

    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720 },
        facingMode: "user",
      },
    });

    r.on(RoomEvent.ParticipantConnected, () => {
      setParticipants([...r.remoteParticipants.values()]);
    });
    r.on(RoomEvent.ParticipantDisconnected, () => {
      setParticipants([...r.remoteParticipants.values()]);
    });
    r.on(RoomEvent.Disconnected, () => setRoom(null));
    r.on(RoomEvent.MediaDevicesError, (e) => setError(e.message));

    r.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token)
      .then(() => {
        setRoom(r);
        setParticipants([...r.remoteParticipants.values()]);
      })
      .catch(setError);

    return () => {
      r.disconnect();
    };
  }, [token, roomName]);

  return { room, participants, error };
}
