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
    <div className="flex h-[100dvh] flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-700/50 dark:bg-gray-800/80 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href={`/workspace/${groupId}`}
            className="flex shrink-0 items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
          <span className="hidden text-gray-400 dark:text-gray-600 sm:inline">/</span>
          <h1 className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-white">
            Planning & Milestones
          </h1>
          {!isConnected && (
            <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              Reconnecting…
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex rounded-md border border-gray-300 bg-white p-0.5 text-xs dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={() => setView("board")}
              className={`rounded px-3 py-1 ${view === "board" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`rounded px-3 py-1 ${view === "timeline" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400"}`}
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
