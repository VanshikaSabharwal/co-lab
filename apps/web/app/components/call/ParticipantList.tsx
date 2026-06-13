"use client";

import { MicOff, User } from "lucide-react";
import type { Participant } from "livekit-client";

interface ParticipantListProps {
  participants: Participant[];
  localParticipant?: Participant | null;
}

export default function ParticipantList({ participants, localParticipant }: ParticipantListProps) {
  const all = localParticipant
    ? [localParticipant, ...participants]
    : participants;

  return (
    <div className="h-full overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Participants ({all.length})
      </h3>
      <ul className="space-y-2">
        {all.map((p) => {
          const identity = p.identity;
          const name = p.name || identity || "Unknown";
          const isLocal = p === localParticipant;
          const isMuted = p.isMicrophoneEnabled === false;
          const isSpeaking = p.isSpeaking;
          return (
            <li
              key={p.sid}
              className={`flex items-center gap-3 rounded-lg p-2 ${
                isSpeaking ? "bg-green-50 dark:bg-green-900/20" : ""
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
                {name}{identity !== name ? ` (${identity})` : ""}
                {isLocal ? " (You)" : ""}
              </div>
              {isMuted && <MicOff className="h-4 w-4 text-red-400" />}
              {isSpeaking && (
                <span className="h-2 w-2 rounded-full bg-green-400" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
