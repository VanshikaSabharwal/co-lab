"use client";

import { useEffect, useRef } from "react";
import type { Room, Participant, RemoteTrack, RemoteTrackPublication, TrackPublication } from "livekit-client";
import { Track } from "livekit-client";

interface ScreenShareViewProps {
  room: Room;
  onClose: () => void;
}

export default function ScreenShareView({ room, onClose }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    function attachScreenShare(publication: TrackPublication) {
      if (publication.source === Track.Source.ScreenShare && publication.track) {
        publication.track.attach(videoEl!);
      }
    }

    function detachScreenShare(publication: TrackPublication) {
      if (publication.source === Track.Source.ScreenShare) {
        publication.track?.detach();
      }
    }

    // Track subscribed/unsubscribed handlers with correct LiveKit signatures
    function onTrackSubscribed(_track: RemoteTrack, publication: RemoteTrackPublication) {
      attachScreenShare(publication);
    }

    function onTrackUnsubscribed(_track: RemoteTrack, publication: RemoteTrackPublication) {
      detachScreenShare(publication);
    }

    // Attach already-subscribed screen share tracks and subscribe to events
    for (const p of room.remoteParticipants.values()) {
      p.trackPublications.forEach(attachScreenShare);
      p.on("trackSubscribed", onTrackSubscribed);
      p.on("trackUnsubscribed", onTrackUnsubscribed);
    }

    // Also watch for new participants joining with screen share
    function onParticipantConnected(p: Participant) {
      p.trackPublications.forEach(attachScreenShare);
      p.on("trackSubscribed", onTrackSubscribed);
      p.on("trackUnsubscribed", onTrackUnsubscribed);
    }
    room.on("participantConnected", onParticipantConnected);

    return () => {
      room.off("participantConnected", onParticipantConnected);
      for (const p of room.remoteParticipants.values()) {
        p.off("trackSubscribed", onTrackSubscribed);
        p.off("trackUnsubscribed", onTrackUnsubscribed);
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
        <video ref={videoRef} autoPlay className="h-full w-full object-contain" />
      </div>
    </div>
  );
}
