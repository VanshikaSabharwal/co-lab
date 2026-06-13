"use client";

import { useState, useCallback, useEffect } from "react";
import { useCall } from "./CallProvider";
import { useScreenShare } from "./hooks/useScreenShare";
import VideoGrid from "./VideoGrid";
import CallControls from "./CallControls";
import ParticipantList from "./ParticipantList";
import ScreenShareView from "./ScreenShareView";
import { X, Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface CallPanelProps {
  onMinimize: () => void;
}

export default function CallPanel({ onMinimize }: CallPanelProps) {
  const { activeCall, endCall } = useCall();

  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(() => {
    if (!activeCall) return true;
    return activeCall.type !== "AUDIO";
  });
  const [participantListOpen, setParticipantListOpen] = useState(false);
  const [screenShareOpen, setScreenShareOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  const room = activeCall?.room ?? null;
  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(room);

  const isAudioOnly = !videoEnabled;

  useEffect(() => {
    if (!room) return;
    const update = () => setParticipants([...room.remoteParticipants.values()]);
    update(); // populate with already-connected participants
    room.on("participantConnected", update);
    room.on("participantDisconnected", update);
    return () => {
      room.off("participantConnected", update);
      room.off("participantDisconnected", update);
    };
  }, [room]);

  useEffect(() => {
    if (!room) return;
    room.localParticipant.setMicrophoneEnabled(!muted);
  }, [muted, room]);

  useEffect(() => {
    if (!room) return;
    room.localParticipant.setCameraEnabled(videoEnabled);
  }, [videoEnabled, room]);

  useEffect(() => {
    if (!room || !activeCall) return;
    if (activeCall.type === "AUDIO") {
      setVideoEnabled(false);
    }
  }, [room, activeCall]);

  const handleToggleScreenShare = useCallback(() => {
    if (isSharing) {
      stopScreenShare();
      setScreenShareOpen(false);
    } else {
      startScreenShare();
      setScreenShareOpen(true);
    }
  }, [isSharing, startScreenShare, stopScreenShare]);

  const handleSwitchToVideo = () => {
    setVideoEnabled(true);
  };

  if (!activeCall) return null;

  // ── Audio-only UI (black screen with controls) ──────────────────────
  if (isAudioOnly) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-medium text-gray-400">Audio Call</span>
          <button
            onClick={onMinimize}
            className="rounded-full p-1 text-gray-500 transition hover:bg-gray-800 hover:text-white"
            title="Minimize"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-800">
            <PhoneOff className="h-10 w-10 text-green-500 animate-pulse" />
          </div>
          <p className="text-xl font-semibold text-white">
            {activeCall.type === "GROUP" ? "Group Call" : "Audio Call"}
          </p>
          <p className="text-sm text-gray-400">{participants.length + 1} participant(s)</p>
        </div>

        <div className="flex items-center justify-center gap-6 px-4 py-8">
          <button
            onClick={() => setMuted((m) => !m)}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
              muted ? "bg-red-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <button
            onClick={handleSwitchToVideo}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-white transition hover:bg-gray-600"
            title="Switch to Video"
          >
            <Video className="h-6 w-6" />
          </button>

          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  // ── Video UI ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-sm font-medium text-white">
          {activeCall.type === "VIDEO" ? "Video Call" : "Group Call"}
        </span>
        <button
          onClick={onMinimize}
          className="rounded-full p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
          title="Minimize"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Screen Share Overlay */}
      {screenShareOpen && room && (
        <ScreenShareView room={room} onClose={() => setScreenShareOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <VideoGrid
            participants={participants}
            localParticipant={room?.localParticipant ?? null}
          />
        </div>

        {participantListOpen && (
          <div className="w-64 flex-shrink-0">
            <ParticipantList
              participants={participants}
              localParticipant={room?.localParticipant ?? null}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-gray-700 bg-gray-800">
        <CallControls
          muted={muted}
          videoEnabled={videoEnabled}
          screenSharing={isSharing}
          participantListOpen={participantListOpen}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleVideo={() => setVideoEnabled((v) => !v)}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleParticipantList={() => setParticipantListOpen((p) => !p)}
          onEndCall={endCall}
        />
      </div>
    </div>
  );
}
