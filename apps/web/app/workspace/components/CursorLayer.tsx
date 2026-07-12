"use client";

import React, { useEffect, useRef, useState } from "react";
import { ViewportPortal, useReactFlow } from "@xyflow/react";
import type { PeerCursorOp } from "../lib/useWorkspaceBoard";

export interface PeerCursor {
  userId: string;
  name: string;
  x: number;
  y: number;
  lastSeen: number;
}

const CURSOR_COLORS = ["#8be9b6", "#f5b8d0", "#a8c7fa", "#fcd34d", "#c4b5fd", "#fda4af"];
const colorFor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

const SEND_INTERVAL_MS = 60;
const STALE_AFTER_MS = 5000;

interface CursorLayerProps {
  userId: string | undefined;
  userName: string;
  /** Register a handler for incoming peer cursor ops. */
  subscribe: (handler: (op: PeerCursorOp) => void) => void;
  sendCursor: (op: { userId: string; name: string; x: number; y: number }) => void;
}

// Renders teammates' cursors in flow coordinates and broadcasts our own.
// Must be mounted inside <ReactFlow> (uses ViewportPortal + flow transforms).
export default function CursorLayer({ userId, userName, subscribe, sendCursor }: CursorLayerProps) {
  const [peers, setPeers] = useState<Record<string, PeerCursor>>({});
  const { screenToFlowPosition } = useReactFlow();
  const lastSent = useRef(0);

  // Receive peer cursors
  useEffect(() => {
    subscribe((op) => {
      if (op.userId === userId) return;
      setPeers((prev) => ({
        ...prev,
        [op.userId]: { userId: op.userId, name: op.name, x: op.x, y: op.y, lastSeen: Date.now() },
      }));
    });
  }, [subscribe, userId]);

  // Expire stale cursors
  useEffect(() => {
    const t = setInterval(() => {
      setPeers((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, c]) => now - c.lastSeen < STALE_AFTER_MS),
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Broadcast our cursor (throttled), in flow coordinates
  useEffect(() => {
    if (!userId) return;
    const onMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastSent.current < SEND_INTERVAL_MS) return;
      const pane = (e.target as HTMLElement)?.closest?.(".react-flow");
      if (!pane) return;
      lastSent.current = now;
      const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      sendCursor({ userId, name: userName, x, y });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [userId, userName, screenToFlowPosition, sendCursor]);

  return (
    <ViewportPortal>
      {Object.values(peers).map((cursor) => {
        const color = colorFor(cursor.userId);
        return (
          <div
            key={cursor.userId}
            className="pointer-events-none absolute z-50"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <svg width="14" height="16" viewBox="0 0 14 16">
              <path d="M1 1 L13 8.5 L7.4 9.6 L4.6 15 Z" fill={color} stroke="#111827" />
            </svg>
            <span
              className="ml-2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-gray-900"
              style={{ backgroundColor: color }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
