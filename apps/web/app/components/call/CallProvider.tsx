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
import toast from "react-hot-toast";

type CallType = "AUDIO" | "VIDEO" | "GROUP";

interface IncomingCall {
  callId: string;
  roomName: string;
  callerId: string;
  callerName: string;
  type: CallType;
  groupId?: string;
}

interface ActiveCall {
  callId: string;
  roomName: string;
  type: CallType;
  token: string;
  room: Room | null;
  groupId?: string;
}

interface CallContextValue {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  initiateCall: (type: CallType, targetId?: string, groupId?: string) => Promise<void>;
  acceptCall: (callId: string, startWithVideo?: boolean) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  setIncomingCall: (call: IncomingCall | null) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  isCalling: boolean;
  joinGroup: (groupId: string) => void;
  leaveGroup: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws").replace(/\/ws$/, "");

export function CallProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const currentGroupRef = useRef<string | null>(null);

  // ── WebSocket connection for call signaling ──────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      if (closed) return;
      try {
        const ws = new WebSocket(`${WS_BASE}/ws?userId=${userId}`);
        wsRef.current = ws;

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

        ws.onopen = () => {
          if (currentGroupRef.current) {
            ws.send(JSON.stringify({ type: "join_group", groupId: currentGroupRef.current }));
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
        case "call_ended": {
          const ac = activeCallRef.current;
          if (ac && ac.callId === msg.callId) {
            ac.room?.disconnect();
            setActiveCall(null);
          }
          break;
        }
        case "call_accepted":
          toast.success("Call accepted");
          break;
        case "call_rejected":
          toast.error("Call rejected");
          activeCallRef.current?.room?.disconnect();
          setActiveCall(null);
          break;
        case "call_missed":
          toast.error("Call missed");
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
        audioCaptureDefaults: {},
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
        groupId,
      });

      // Notify via WebSocket
      if (groupId) {
        wsSend({
          type: "call_offer",
          callId: data.callRoom.id,
          roomName: data.roomName,
          groupId,
          callerName: session.user.name || session.user.email || "Unknown",
          callType: type,
        });
      } else if (targetId) {
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
  const acceptCall = useCallback(async (callId: string, startWithVideo: boolean = true) => {
    try {
      const res = await fetch(`/api/calls/${callId}/accept`, {
        method: "PUT",
      });

      if (!res.ok) throw new Error("Failed to accept call");

      const data = await res.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {},
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
          facingMode: "user",
        },
      });

      await room.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL!,
        data.token,
      );

      if (!startWithVideo) {
        room.localParticipant.setCameraEnabled(false);
      }

      setActiveCall({
        callId: data.callId,
        roomName: data.roomName,
        type: incomingCall?.type || "VIDEO",
        token: data.token,
        room,
        groupId: incomingCall?.groupId,
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
        ...(activeCall.groupId ? { groupId: activeCall.groupId } : {}),
      });
      setActiveCall(null);
    }
  }, [activeCall, wsSend]);

  const joinGroup = useCallback((groupId: string) => {
    currentGroupRef.current = groupId;
    wsSend({ type: "join_group", groupId });
  }, [wsSend]);

  const leaveGroup = useCallback(() => {
    const gId = currentGroupRef.current;
    currentGroupRef.current = null;
    if (gId) {
      wsSend({ type: "leave_group", groupId: gId });
    }
  }, [wsSend]);

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
      joinGroup,
      leaveGroup,
    }}>
      {children}
    </CallContext.Provider>
  );
}
