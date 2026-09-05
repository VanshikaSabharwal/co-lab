"use client";

import { Loader2, PhoneOff } from "lucide-react";
import { useCall } from "./CallProvider";

/**
 * Shown between accepting/starting a call and the room being usable.
 *
 * That gap is a signalling handshake plus a getUserMedia permission prompt —
 * routinely a few seconds. It used to pass with the incoming-call modal frozen
 * on screen, which read as an unresponsive button and got double-clicked.
 */
export default function ConnectingOverlay() {
  const { endCall } = useCall();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gray-900 text-white">
      <Loader2 className="h-10 w-10 animate-spin text-green-400" />
      <div className="text-center">
        <p className="text-base font-medium">Connecting…</p>
        <p className="mt-1 text-sm text-gray-400">
          Allow microphone access if your browser asks.
        </p>
      </div>
      <button
        onClick={endCall}
        className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium transition hover:bg-red-700"
      >
        <PhoneOff className="h-4 w-4" />
        <span>Cancel</span>
      </button>
    </div>
  );
}
