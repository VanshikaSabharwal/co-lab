"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Room } from "livekit-client";
import { useSession } from "next-auth/react";

type CallType = "AUDIO" | "VIDEO" | "GROUP";

interface IncomingCall {
  callId: string;
  roomName: string;
  callerId: string;
  callerName: string;
  type: CallType;
}

interface ActiveCall {
  callId: string;
  roomName: string;
  type: CallType;
  token: string;
  room: Room | null;
}

interface CallContextValue {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  initiateCall: (type: CallType, targetId?: string, groupId?: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  setIncomingCall: (call: IncomingCall | null) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  isCalling: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

export function CallProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // ── WebSocket connection for call signaling ──────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      if (closed) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "register", userId }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleSignalingMessage(msg);
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!closed) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    }

    function handleSignalingMessage(msg: any) {
      switch (msg.type) {
        case "call_offer":
          setIncomingCall({
            callId: msg.callId,
            roomName: msg.roomName,
            callerId: msg.callerId,
            callerName: msg.callerName,
            type: msg.type === "GROUP" ? "GROUP" : msg.callType || "VIDEO",
          });
          break;
        case "call_ended":
          if (activeCall?.callId === msg.callId) {
            activeCall.room?.disconnect();
            setActiveCall(null);
          }
          break;
        case "call_missed":
          // Could show a toast
          break;
      }
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [session?.user?.id]);

  // ── Room cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      activeCall?.room?.disconnect();
    };
  }, []);

  // ── Send via WebSocket helper ────────────────────────────────────────
  const wsSend = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // ── initiateCall ─────────────────────────────────────────────────────
  const initiateCall = useCallback(async (
    type: CallType,
    targetId?: string,
    groupId?: string,
  ) => {
    if (!session?.user?.id) return;
    setIsCalling(true);

    try {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, groupId }),
      });

      if (!res.ok) throw new Error("Failed to initiate call");

      const data = await res.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
          facingMode: "user",
        },
      });

      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL!,
        data.token,
      );

      setActiveCall({
        callId: data.callRoom.id,
        roomName: data.roomName,
        type,
        token: data.token,
        room,
      });

      // Notify target via WebSocket
      if (targetId) {
        wsSend({
          type: "call_offer",
          callId: data.callRoom.id,
          roomName: data.roomName,
          targetId,
          callerName: session.user.name || session.user.email || "Unknown",
          callType: type,
        });
      }
    } catch (error) {
      console.error("Initiate call error:", error);
    } finally {
      setIsCalling(false);
    }
  }, [session, wsSend]);

  // ── acceptCall ──────────────────────────────────────────────────────
  const acceptCall = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/calls/${callId}/accept`, {
        method: "PUT",
      });

      if (!res.ok) throw new Error("Failed to accept call");

      const data = await res.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
          facingMode: "user",
        },
      });

      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL!,
        data.token,
      );

      setActiveCall({
        callId: data.callId,
        roomName: data.roomName,
        type: incomingCall?.type || "VIDEO",
        token: data.token,
        room,
      });

      setIncomingCall(null);

      // Notify initiator via WebSocket
      if (incomingCall?.callerId) {
        wsSend({
          type: "call_accepted",
          callId: data.callId,
          roomName: data.roomName,
          token: data.token,
          initiatorId: incomingCall.callerId,
        });
      }
    } catch (error) {
      console.error("Accept call error:", error);
    }
  }, [incomingCall, wsSend]);

  // ── rejectCall ──────────────────────────────────────────────────────
  const rejectCall = useCallback(async (callId: string) => {
    try {
      await fetch(`/api/calls/${callId}/reject`, { method: "PUT" });
    } catch (error) {
      console.error("Reject call error:", error);
    } finally {
      if (incomingCall) {
        wsSend({
          type: "call_rejected",
          callId,
          initiatorId: incomingCall.callerId,
          reason: "rejected",
        });
      }
      setIncomingCall(null);
    }
  }, [incomingCall, wsSend]);

  // ── endCall ─────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      activeCall.room?.disconnect();
      await fetch(`/api/calls/${activeCall.callId}/end`, { method: "PUT" });
    } catch (error) {
      console.error("End call error:", error);
    } finally {
      wsSend({
        type: "call_ended",
        callId: activeCall.callId,
      });
      setActiveCall(null);
    }
  }, [activeCall, wsSend]);

  return (
    <CallContext.Provider value={{
      incomingCall,
      activeCall,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      setIncomingCall,
      setActiveCall,
      isCalling,
    }}>
      {children}
    </CallContext.Provider>
  );
}
