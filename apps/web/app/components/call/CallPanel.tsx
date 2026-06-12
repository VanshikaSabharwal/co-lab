"use client";

import { useState, useCallback, useEffect } from "react";
import { useCall } from "./CallProvider";
import { useScreenShare } from "./hooks/useScreenShare";
import VideoGrid from "./VideoGrid";
import CallControls from "./CallControls";
import ParticipantList from "./ParticipantList";
import ScreenShareView from "./ScreenShareView";
import { X } from "lucide-react";

interface CallPanelProps {
  onMinimize: () => void;
}

export default function CallPanel({ onMinimize }: CallPanelProps) {
  const { activeCall, endCall } = useCall();

  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [participantListOpen, setParticipantListOpen] = useState(false);
  const [screenShareOpen, setScreenShareOpen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  const room = activeCall?.room ?? null;
  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(room);

  useEffect(() => {
    if (!room) return;
    const update = () => setParticipants([...room.remoteParticipants.values()]);
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

  const handleToggleScreenShare = useCallback(() => {
    if (isSharing) {
      stopScreenShare();
      setScreenShareOpen(false);
    } else {
      startScreenShare();
      setScreenShareOpen(true);
    }
  }, [isSharing, startScreenShare, stopScreenShare]);

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-sm font-medium text-white">
          {activeCall.type === "VIDEO" ? "Video Call" : "Audio Call"}
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
