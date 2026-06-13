"use client";

import { useEffect, useRef } from "react";
import { useCall } from "./CallProvider";
import { Phone, PhoneOff, Video } from "lucide-react";

function useRingtone(playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      timerRef.current && clearInterval(timerRef.current);
      oscRef.current?.stop();
      oscRef.current?.disconnect();
      ctxRef.current?.close();
      ctxRef.current = null;
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    gain.connect(ctx.destination);
    gainRef.current = gain;

    let on = true;
    timerRef.current = setInterval(() => {
      if (on) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 440;
        osc.connect(gain);
        osc.start();
        oscRef.current = osc;
      } else {
        oscRef.current?.stop();
        oscRef.current?.disconnect();
        oscRef.current = null;
      }
      on = !on;
    }, 600);

    return () => {
      timerRef.current && clearInterval(timerRef.current);
      oscRef.current?.stop();
      oscRef.current?.disconnect();
      ctx.close();
    };
  }, [playing]);
}

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  useRingtone(!!incomingCall);

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
          {(incomingCall.type === "VIDEO" || incomingCall.type === "GROUP") && (
            <button
              onClick={() => acceptCall(incomingCall.callId, true)}
              className="flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-white transition hover:bg-green-600"
            >
              <Video className="h-5 w-5" />
              <span>Accept Video</span>
            </button>
          )}
          <button
            onClick={() => acceptCall(incomingCall.callId, false)}
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
