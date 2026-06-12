"use client";

import { useEffect, useRef } from "react";
import type { Room, Participant } from "livekit-client";

interface ScreenShareViewProps {
  room: Room;
  onClose: () => void;
}

export default function ScreenShareView({ room, onClose }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const remoteParticipants = [...room.remoteParticipants.values()];
    for (const p of remoteParticipants) {
      const screenPub = p.getTrackPublication("screen_share");
      if (screenPub?.track) {
        screenPub.track.attach(videoRef.current!);
        return () => {
          screenPub.track?.detach();
        };
      }
    }
  }, [room]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-gray-900 p-3">
        <span className="text-sm font-medium text-white">Screen Share</span>
        <button
          onClick={onClose}
          className="rounded bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20"
        >
          Back to Grid
        </button>
      </div>
      <div className="flex-1">
        <video ref={videoRef} autoPlay className="h-full w-full object-contain" />
      </div>
    </div>
  );
}
