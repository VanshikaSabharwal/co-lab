"use client";

import { PhoneOff, Mic, MicOff, Video, VideoOff, MonitorUp, Users } from "lucide-react";

interface CallControlsProps {
  muted: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  participantListOpen: boolean;
  showMicHint?: boolean;
  showVideoHint?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipantList: () => void;
  onEndCall: () => void;
}

export default function CallControls({
  muted,
  videoEnabled,
  screenSharing,
  participantListOpen,
  showMicHint,
  showVideoHint,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipantList,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3">
      <ControlButton
        active={!muted}
        icon={muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        label={muted ? "Unmute" : "Mute"}
        variant={muted ? "destructive" : "default"}
        hint={showMicHint ? "Turn on mic" : undefined}
        hintAlign="right"
        onClick={onToggleMute}
      />
      <ControlButton
        active={videoEnabled}
        icon={videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        label={videoEnabled ? "Video On" : "Video Off"}
        variant={videoEnabled ? "default" : "destructive"}
        hint={showVideoHint ? "Turn on camera" : undefined}
        hintAlign="left"
        onClick={onToggleVideo}
      />
      <ControlButton
        active={screenSharing}
        icon={<MonitorUp className="h-5 w-5" />}
        label={screenSharing ? "Stop Share" : "Share Screen"}
        variant={screenSharing ? "active" : "default"}
        onClick={onToggleScreenShare}
      />
      <ControlButton
        active={participantListOpen}
        icon={<Users className="h-5 w-5" />}
        label="Participants"
        variant={participantListOpen ? "active" : "default"}
        onClick={onToggleParticipantList}
      />
      <button
        onClick={onEndCall}
        className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-white shadow-lg transition hover:bg-red-700"
      >
        <PhoneOff className="h-5 w-5" />
        <span className="text-sm font-medium">End Call</span>
      </button>
    </div>
  );
}

interface ControlButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  variant: "default" | "destructive" | "active";
  hint?: string;
  // Which way the hint extends so adjacent hints don't overlap.
  hintAlign?: "left" | "right" | "center";
  onClick: () => void;
}

function ControlButton({ icon, label, variant, hint, hintAlign = "center", onClick }: ControlButtonProps) {
  const bg =
    variant === "destructive"
      ? "bg-red-500 hover:bg-red-600"
      : variant === "active"
        ? "bg-green-500 hover:bg-green-600"
        : "bg-gray-700 hover:bg-gray-600";

  // Anchor the hint outward from the button so two neighbouring hints spread
  // apart instead of colliding. The little arrow stays over the button.
  const hintPos =
    hintAlign === "right"
      ? "right-0"
      : hintAlign === "left"
        ? "left-0"
        : "left-1/2 -translate-x-1/2";
  const arrowPos =
    hintAlign === "right"
      ? "right-3"
      : hintAlign === "left"
        ? "left-3"
        : "left-1/2 -translate-x-1/2";

  return (
    <div className="relative flex flex-col items-center">
      {/* Anchored "turn on" hint that points down at this button */}
      {hint && (
        <button
          onClick={onClick}
          className={`absolute bottom-full ${hintPos} mb-2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-gray-900 shadow-lg animate-bounce`}
        >
          {hint}
          <span className={`absolute ${arrowPos} top-full border-4 border-transparent border-t-white`} />
        </button>
      )}
      <button
        onClick={onClick}
        className={`flex items-center justify-center rounded-full p-3 text-white transition ${bg}`}
        title={label}
      >
        {icon}
      </button>
    </div>
  );
}
