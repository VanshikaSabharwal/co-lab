"use client";

import { useState } from "react";
import { useCall } from "./CallProvider";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCallBar from "./ActiveCallBar";
import CallPanel from "./CallPanel";

export default function CallUI() {
  const { incomingCall, activeCall } = useCall();
  const [expanded, setExpanded] = useState(false);

  if (!incomingCall && !activeCall) return null;

  return (
    <>
      {incomingCall && <IncomingCallModal />}

      {activeCall && !expanded && (
        <ActiveCallBar onExpand={() => setExpanded(true)} />
      )}

      {activeCall && expanded && (
        <CallPanel onMinimize={() => setExpanded(false)} />
      )}
    </>
  );
}
