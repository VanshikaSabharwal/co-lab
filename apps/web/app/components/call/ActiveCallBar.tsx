"use client";

import { useState, useEffect } from "react";
import { useCall } from "./CallProvider";
import { PhoneOff, Mic, MicOff, Maximize2 } from "lucide-react";

interface ActiveCallBarProps {
  onExpand: () => void;
}

export default function ActiveCallBar({ onExpand }: ActiveCallBarProps) {
  const { activeCall, endCall } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!activeCall) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  useEffect(() => {
    if (!activeCall?.room) return;
    activeCall.room.localParticipant.setMicrophoneEnabled(!muted);
  }, [muted, activeCall?.room]);

  if (!activeCall) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-green-600 px-4 py-2 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        <span className="text-sm font-medium">
          {activeCall.type === "VIDEO" ? "Video Call" : "Audio Call"} — {formatTime(elapsed)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-full p-2 transition hover:bg-green-700"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <button
          onClick={onExpand}
          className="rounded-full p-2 transition hover:bg-green-700"
          title="Expand call"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <button
          onClick={endCall}
          className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium transition hover:bg-red-700"
        >
          <PhoneOff className="h-4 w-4" />
          <span>End</span>
        </button>
      </div>
    </div>
  );
}
