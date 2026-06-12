"use client";

import { useRef, useEffect } from "react";
import type { Participant, TrackPublication } from "livekit-client";
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
  const name = participant.name || participant.identity || "Unknown";

  useEffect(() => {
    const sub = participant.trackPublications.forEach((pub: TrackPublication) => {
      if (pub.track) {
        if (pub.kind === Track.Kind.Video && videoRef.current) {
          pub.track.attach(videoRef.current);
        }
        if (pub.kind === Track.Kind.Audio && audioRef.current && !isLocal) {
          pub.track.attach(audioRef.current);
        }
      }
    });
    return () => {
      participant.trackPublications.forEach((pub: TrackPublication) => {
        if (pub.track) {
          pub.track.detach();
        }
      });
    };
  }, [participant, isLocal]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-800 ${
        isSpeaking ? "ring-2 ring-green-400" : ""
      }`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-600">
            <User className="h-8 w-8 text-gray-300" />
          </div>
        </div>
      )}

      <audio ref={audioRef} autoPlay playsInline />

      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
        {isMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="text-xs font-medium text-white">
          {name}{isLocal ? " (You)" : ""}
        </span>
      </div>
    </div>
  );
}
