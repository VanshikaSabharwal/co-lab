"use client";

import { useState, useEffect } from "react";
import { useCall } from "./CallProvider";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCallBar from "./ActiveCallBar";
import CallPanel from "./CallPanel";

export default function CallUI() {
  const { incomingCall, activeCall } = useCall();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (activeCall) {
      setExpanded(true);
    }
  }, [!!activeCall]);

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
