"use client";

import { useRef, useEffect } from "react";
import type { Participant, TrackPublication, RemoteTrack, RemoteTrackPublication } from "livekit-client";
import { Track } from "livekit-client";
import { MicOff, User } from "lucide-react";

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
}

export default function VideoTile({ participant, isLocal }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isSpeaking = participant.isSpeaking;
  const isMuted = participant.isMicrophoneEnabled === false;
  const hasVideo = participant.isCameraEnabled;
  const identity = participant.identity;
  const name = participant.name || identity || "Unknown";

  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;

    function attach(pub: TrackPublication) {
      if (!pub.track) return;
      if (pub.kind === Track.Kind.Video && videoEl) {
        pub.track.attach(videoEl);
      }
      if (pub.kind === Track.Kind.Audio && audioEl && !isLocal) {
        pub.track.attach(audioEl);
      }
    }

    function detach(pub: TrackPublication) {
      pub.track?.detach();
    }

    // Attach already-subscribed tracks
    participant.trackPublications.forEach(attach);

    function onTrackPublished(publication: RemoteTrackPublication) {
      if (publication.track) attach(publication);
    }

    function onTrackSubscribed(_track: RemoteTrack, publication: RemoteTrackPublication) {
      attach(publication);
    }

    function onTrackUnsubscribed(_track: RemoteTrack, publication: RemoteTrackPublication) {
      detach(publication);
    }

    participant.on("trackPublished", onTrackPublished);
    participant.on("trackSubscribed", onTrackSubscribed);
    participant.on("trackUnsubscribed", onTrackUnsubscribed);

    return () => {
      participant.off("trackPublished", onTrackPublished);
      participant.off("trackSubscribed", onTrackSubscribed);
      participant.off("trackUnsubscribed", onTrackUnsubscribed);
      participant.trackPublications.forEach(detach);
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
        className={`h-full w-full object-cover ${hasVideo ? '' : 'hidden'}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-600">
            <User className="h-8 w-8 text-gray-300" />
          </div>
        </div>
      )}

      <audio ref={audioRef} autoPlay playsInline />

      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
        {isMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="text-xs font-medium text-white">
          {name}{identity !== name ? ` (${identity})` : ""}{isLocal ? " - You" : ""}
        </span>
      </div>
    </div>
  );
}
