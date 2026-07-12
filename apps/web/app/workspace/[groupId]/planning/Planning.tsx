"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { usePlanningBoard } from "../../lib/usePlanningBoard";
import PresenceBar from "../../components/PresenceBar";
import KanbanBoard from "./KanbanBoard";
import MilestoneTimeline from "./MilestoneTimeline";

interface PlanningProps {
  groupId: string;
}

type View = "board" | "timeline";

export default function Planning({ groupId }: PlanningProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [view, setView] = useState<View>("board");

  const { content, presence, isConnected, updateContent } = usePlanningBoard({ groupId, userId });

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <div className="flex items-center justify-between border-b border-gray-700/50 bg-gray-800/80 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${groupId}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} />
            Workspace
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-sm font-semibold text-white">Planning & Milestones</h1>
          {!isConnected && (
            <span className="rounded bg-amber-900/50 px-2 py-0.5 text-[11px] text-amber-300">
              Reconnecting…
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-md border border-gray-700 bg-gray-900 p-0.5 text-xs">
            <button
              onClick={() => setView("board")}
              className={`rounded px-3 py-1 ${view === "board" ? "bg-blue-600 text-white" : "text-gray-400"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`rounded px-3 py-1 ${view === "timeline" ? "bg-blue-600 text-white" : "text-gray-400"}`}
            >
              Timeline
            </button>
          </div>
          <PresenceBar userIds={presence} currentUserId={userId} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {view === "board" ? (
          <KanbanBoard content={content} updateContent={updateContent} />
        ) : (
          <MilestoneTimeline content={content} updateContent={updateContent} />
        )}
      </div>
    </div>
  );
}
