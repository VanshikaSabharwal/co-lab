"use client";

import { useEffect, useRef } from "react";
import { useCall } from "./CallProvider";
import { Phone, PhoneOff, Video, Users } from "lucide-react";

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
  const { incomingCall, acceptCall, rejectCall, callStatus } = useCall();
  // The modal now closes on click rather than after the round-trip, but a
  // double-click can still land two handlers in the same frame.
  const busy = callStatus === "connecting";

  useRingtone(!!incomingCall);

  if (!incomingCall) return null;

  // A group call is an open room anyone can join, not a person waiting on you
  // to pick up — so it reads "join", not "accept".
  const isGroup = incomingCall.type === "GROUP";
  const offersVideo = isGroup || incomingCall.type === "VIDEO";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              isGroup
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            }`}
          >
            {isGroup ? (
              <Users className="h-8 w-8 animate-pulse text-blue-500" />
            ) : (
              <Phone className="h-8 w-8 animate-pulse text-green-500" />
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {incomingCall.callerName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isGroup
              ? "started a group call"
              : `${incomingCall.type === "VIDEO" ? "Video" : "Audio"} call incoming...`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {isGroup ? (
            <>
              <button
                onClick={() => acceptCall(incomingCall.callId, true)}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Video className="h-5 w-5" />
                <span>Join now</span>
              </button>
              <button
                onClick={() => acceptCall(incomingCall.callId, false)}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-6 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Phone className="h-4 w-4" />
                <span>Join with audio only</span>
              </button>
              <button
                onClick={() => rejectCall(incomingCall.callId)}
                disabled={busy}
                className="w-full rounded-full px-6 py-2 text-sm text-gray-500 transition hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-gray-200"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center gap-3">
                {offersVideo && (
                  <button
                    onClick={() => acceptCall(incomingCall.callId, true)}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-full bg-green-500 px-5 py-3 text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Video className="h-5 w-5" />
                    <span>Accept Video</span>
                  </button>
                )}
                <button
                  onClick={() => acceptCall(incomingCall.callId, false)}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-full bg-green-500 px-5 py-3 text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Phone className="h-5 w-5" />
                  <span>Accept Audio</span>
                </button>
              </div>
              <button
                onClick={() => rejectCall(incomingCall.callId)}
                disabled={busy}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-2.5 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PhoneOff className="h-5 w-5" />
                <span>Reject</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
