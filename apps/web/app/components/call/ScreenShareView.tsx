"use client";

import { useEffect, useRef } from "react";
import type { Room } from "livekit-client";
import { Track, RoomEvent } from "livekit-client";

interface ScreenShareViewProps {
  room: Room;
  onClose: () => void;
}

export default function ScreenShareView({ room, onClose }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Find whoever is currently sharing (local OR remote) and attach it.
    function attachActiveShare() {
      const participants = [room.localParticipant, ...room.remoteParticipants.values()];
      for (const p of participants) {
        for (const pub of p.trackPublications.values()) {
          if (pub.source === Track.Source.ScreenShare && pub.track) {
            pub.track.attach(videoEl!);
            return true;
          }
        }
      }
      return false;
    }

    attachActiveShare();

    // Re-scan whenever any track changes — covers the sharer's own local track
    // (LocalTrackPublished) and remote shares (TrackSubscribed).
    const onChange = () => attachActiveShare();
    room.on(RoomEvent.TrackSubscribed, onChange);
    room.on(RoomEvent.TrackUnsubscribed, onChange);
    room.on(RoomEvent.LocalTrackPublished, onChange);
    room.on(RoomEvent.LocalTrackUnpublished, onChange);
    room.on(RoomEvent.ParticipantConnected, onChange);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onChange);
      room.off(RoomEvent.TrackUnsubscribed, onChange);
      room.off(RoomEvent.LocalTrackPublished, onChange);
      room.off(RoomEvent.LocalTrackUnpublished, onChange);
      room.off(RoomEvent.ParticipantConnected, onChange);
      // Detach any screen-share track from our element
      const participants = [room.localParticipant, ...room.remoteParticipants.values()];
      for (const p of participants) {
        for (const pub of p.trackPublications.values()) {
          if (pub.source === Track.Source.ScreenShare) pub.track?.detach(videoEl);
        }
      }
    };
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
        {/* muted so the sharer doesn't get audio feedback from their own share */}
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
      </div>
    </div>
  );
}
