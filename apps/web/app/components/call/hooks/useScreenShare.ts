"use client";

import { useCallback, useState } from "react";
import type { Room } from "livekit-client";

export function useScreenShare(room: Room | null) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScreenShare = useCallback(async () => {
    if (!room) return;

    try {
      await room.localParticipant.setScreenShareEnabled(true);
      setIsSharing(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room]);

  const stopScreenShare = useCallback(() => {
    if (!room) return;
    room.localParticipant.setScreenShareEnabled(false);
    setIsSharing(false);
  }, [room]);

  return { isSharing, startScreenShare, stopScreenShare, error };
}
