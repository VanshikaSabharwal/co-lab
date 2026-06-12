"use client";

import { useCall } from "./CallProvider";
import { Phone, PhoneOff, Video } from "lucide-react";

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Phone className="h-8 w-8 animate-pulse text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {incomingCall.callerName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {incomingCall.type === "VIDEO" ? "Video call" : "Audio call"} incoming...
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => rejectCall(incomingCall.callId)}
            className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-white transition hover:bg-red-600"
          >
            <PhoneOff className="h-5 w-5" />
            <span>Reject</span>
          </button>
          {incomingCall.type === "VIDEO" && (
            <button
              onClick={() => acceptCall(incomingCall.callId)}
              className="flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-white transition hover:bg-green-600"
            >
              <Video className="h-5 w-5" />
              <span>Accept Video</span>
            </button>
          )}
          <button
            onClick={() => acceptCall(incomingCall.callId)}
            className="flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-white transition hover:bg-green-600"
          >
            <Phone className="h-5 w-5" />
            <span>Accept Audio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
