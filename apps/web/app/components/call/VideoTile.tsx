"use client";

import { useRef, useEffect, useReducer } from "react";
import type { Participant, TrackPublication } from "livekit-client";
import { Track, ParticipantEvent } from "livekit-client";
import { MicOff, User } from "lucide-react";

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
}

export default function VideoTile({ participant, isLocal }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // LiveKit mutates the participant object in place; force a re-render on its
  // events so the getters below (isCameraEnabled, isSpeaking…) stay current.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const isSpeaking = participant.isSpeaking;
  const isMuted = participant.isMicrophoneEnabled === false;
  const hasVideo = participant.isCameraEnabled;
  const name = participant.name?.trim() || "Unknown";

  useEffect(() => {
    const videoEl = videoRef.current;

    function attach(pub: TrackPublication) {
      if (!pub.track) return;
      if (pub.kind === Track.Kind.Video && videoEl) {
        pub.track.attach(videoEl);
      }
      // Audio is deliberately not attached here. RoomAudioRenderer owns
      // playback for the whole call — attaching in both places double-plays
      // every remote track, and tiles only exist while the panel is expanded.
    }

    // (Re)attach every current publication and re-render for the getters.
    function sync() {
      participant.trackPublications.forEach(attach);
      rerender();
    }

    sync();

    // Local participant emits Local*; remote emits Track(Subscribed|Published).
    // Listen to both sets so a single tile works for you and for others.
    const events: ParticipantEvent[] = [
      ParticipantEvent.TrackPublished,
      ParticipantEvent.TrackSubscribed,
      ParticipantEvent.TrackUnsubscribed,
      ParticipantEvent.TrackMuted,
      ParticipantEvent.TrackUnmuted,
      ParticipantEvent.LocalTrackPublished,
      ParticipantEvent.LocalTrackUnpublished,
      ParticipantEvent.IsSpeakingChanged,
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events.forEach((e) => participant.on(e as any, sync));

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      events.forEach((e) => participant.off(e as any, sync));
      participant.trackPublications.forEach((pub) => pub.track?.detach());
    };
  }, [participant, isLocal]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-800 ${
        isSpeaking ? "ring-2 ring-green-400" : ""
      }`}
    >
      {/* Always render video so the ref stays valid across camera toggles */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full object-cover ${hasVideo ? "" : "hidden"}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-600">
            <User className="h-8 w-8 text-gray-300" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
        {isMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="text-xs font-medium text-white">
          {name}
          {isLocal ? " (You)" : ""}
        </span>
      </div>
    </div>
  );
}
