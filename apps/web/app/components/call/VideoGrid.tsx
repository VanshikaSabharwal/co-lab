"use client";

import type { Participant } from "livekit-client";
import VideoTile from "./VideoTile";

interface VideoGridProps {
  participants: Participant[];
  localParticipant?: Participant | null;
}

export default function VideoGrid({ participants, localParticipant }: VideoGridProps) {
  const all = localParticipant
    ? [localParticipant, ...participants]
    : participants;

  if (all.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        No participants yet
      </div>
    );
  }

  const gridCols =
    all.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : all.length <= 4
        ? "grid-cols-2"
        : "grid-cols-2 md:grid-cols-3";

  return (
    <div className={`grid h-full gap-2 p-2 ${gridCols}`}>
      {all.map((p) => (
        <VideoTile
          key={p.sid}
          participant={p}
          isLocal={p === localParticipant}
        />
      ))}
    </div>
  );
}
