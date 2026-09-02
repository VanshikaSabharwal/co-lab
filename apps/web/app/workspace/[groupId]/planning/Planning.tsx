"use client";

import React, { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "../../../lib/utils";
import { usePlanningData, type PlanningTask } from "../../lib/usePlanningData";
import { boardProgress } from "../../lib/boardProgress";
import WorkspaceSidebar from "../../components/WorkspaceSidebar";
import WorkspaceTopBar from "../../components/WorkspaceTopBar";
import TaskBoard from "./TaskBoard";
import TaskTimeline from "./TaskTimeline";
import TaskSheet from "./TaskSheet";
import CreateTaskDialog from "./CreateTaskDialog";
import { positionForMove } from "../../lib/position";

interface PlanningProps {
  groupId: string;
}

type View = "board" | "timeline";

export default function Planning({ groupId }: PlanningProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  // Column the create dialog opens on; null when the dialog is closed.
  const [creatingIn, setCreatingIn] = useState<string | null>(null);

  const board = usePlanningData({ groupId, userId });

  // Search filters the loaded board by title or assignee name — no round trip.
  const query = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return null;
    return new Set(
      board.tasks
        .filter((task) => {
          if (task.title.toLowerCase().includes(query)) return true;
          return task.assigneeIds.some((id) =>
            (board.membersById.get(id)?.name ?? "").toLowerCase().includes(query),
          );
        })
        .map((t) => t.id),
    );
  }, [query, board.tasks, board.membersById]);

  const visibleByColumn = useMemo(() => {
    if (!matches) return board.tasksByColumn;
    const next = new Map<string, PlanningTask[]>();
    for (const [columnId, tasks] of board.tasksByColumn) {
      next.set(
        columnId,
        tasks.filter((t) => matches.has(t.id)),
      );
    }
    return next;
  }, [matches, board.tasksByColumn]);

  const visibleTasks = useMemo(
    () => (matches ? board.tasks.filter((t) => matches.has(t.id)) : board.tasks),
    [matches, board.tasks],
  );

  const progress = useMemo(
    () => boardProgress(board.columns, board.tasks),
    [board.columns, board.tasks],
  );

  const openTask = openTaskId ? (board.tasks.find((t) => t.id === openTaskId) ?? null) : null;
  const currentMember = userId ? board.membersById.get(userId) : undefined;
  const presentMembers = board.presence
    .map((id) => board.membersById.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const handleMoveTask = (taskId: string, columnId: string, position: number) => {
    board.updateTask(taskId, { columnId, position });
  };

  const handleAddColumn = () => board.addColumn("New column");

  // Creation goes through a dialog so a blank untitled card never lands on the
  // board; clicking an existing card still opens the lighter edit sheet.
  const handleAddTask = (columnId: string) => setCreatingIn(columnId);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden
        />
      )}

      <WorkspaceSidebar
        groupId={groupId}
        groupName={board.groupName}
        members={board.members}
        progress={progress}
        active="planning"
        counts={{ tasks: board.tasks.length }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopBar
          groupId={groupId}
          crumbs={[
            { label: "Workspace", href: `/workspace/${groupId}` },
            { label: "Planning & Milestones" },
          ]}
          isSaving={board.isSaving}
          isOffline={board.isOffline}
          search={search}
          onSearchChange={setSearch}
          presentMembers={presentMembers}
          currentUser={currentMember}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800 sm:px-4">
          <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs dark:border-gray-800 dark:bg-gray-900">
            {(["board", "timeline"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-3 py-1 capitalize transition-colors",
                  view === v
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {query && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {visibleTasks.length} match{visibleTasks.length === 1 ? "" : "es"}
            </span>
          )}
        </div>

        <main className="flex-1 overflow-hidden">
          {!board.loaded ? (
            <p className="p-6 text-sm text-gray-400">Loading board…</p>
          ) : view === "board" ? (
            <TaskBoard
              columns={board.columns}
              tasksByColumn={visibleByColumn}
              members={board.membersById}
              searching={Boolean(query)}
              onAddColumn={handleAddColumn}
              onRenameColumn={(id, title) => board.updateColumn(id, { title })}
              onDeleteColumn={board.deleteColumn}
              onAddTask={handleAddTask}
              onOpenTask={(t) => setOpenTaskId(t.id)}
              onDeleteTask={board.deleteTask}
              onMoveTask={handleMoveTask}
            />
          ) : (
            <TaskTimeline
              tasks={visibleTasks}
              columns={board.columns}
              members={board.membersById}
              onOpenTask={(t) => setOpenTaskId(t.id)}
            />
          )}
        </main>
      </div>

      {creatingIn && (
        <CreateTaskDialog
          columns={board.columns}
          members={board.members}
          defaultColumnId={creatingIn}
          onCreate={board.addTask}
          onClose={() => setCreatingIn(null)}
        />
      )}

      {openTask && (
        <TaskSheet
          task={openTask}
          members={board.members}
          milestones={board.milestones}
          onPatch={(patch) => board.updateTask(openTask.id, patch)}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
