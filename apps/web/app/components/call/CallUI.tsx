"use client";

import { useState, useEffect } from "react";
import { useCall } from "./CallProvider";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCallBar from "./ActiveCallBar";
import CallPanel from "./CallPanel";
import ConnectingOverlay from "./ConnectingOverlay";
import RoomAudioRenderer from "./RoomAudioRenderer";

export default function CallUI() {
  const { incomingCall, activeCall, callStatus } = useCall();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (activeCall) {
      setExpanded(true);
    }
  }, [!!activeCall]);

  // "connecting" covers the window after the modal is dismissed but before the
  // room exists, so the user is never looking at a screen with nothing on it.
  const connecting = callStatus === "connecting" && !activeCall;

  if (!incomingCall && !activeCall && !connecting) return null;

  return (
    <>
      {/* Mounted for the whole call, so remote audio keeps playing whether the
          call is expanded, minimised, or audio-only with no tiles rendered. */}
      {activeCall && <RoomAudioRenderer room={activeCall.room} />}

      {incomingCall && <IncomingCallModal />}

      {connecting && <ConnectingOverlay />}

      {activeCall && !expanded && (
        <ActiveCallBar onExpand={() => setExpanded(true)} />
      )}

      {activeCall && expanded && (
        <CallPanel onMinimize={() => setExpanded(false)} />
      )}
    </>
  );
}
