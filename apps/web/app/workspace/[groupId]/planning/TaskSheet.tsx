"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import Avatar, { type AvatarUser } from "../../components/Avatar";
import type { PlanningMilestone, PlanningTask } from "../../lib/usePlanningData";
import { PRIORITY_META, PRIORITY_ORDER } from "../../lib/taskMeta";
import { cn } from "../../../lib/utils";

interface TaskSheetProps {
  task: PlanningTask;
  members: AvatarUser[];
  milestones: PlanningMilestone[];
  onPatch: (patch: Partial<PlanningTask>) => void;
  onClose: () => void;
}

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

/**
 * Task detail: title, description, schedule, assignees, milestone.
 *
 * Text fields commit on blur rather than per keystroke — each save is a request
 * plus a broadcast, and typing a title would otherwise fire one per character.
 */
export default function TaskSheet({ task, members, milestones, onPatch, onClose }: TaskSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  // Resync when a different task is opened, or a peer edits this one.
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.id, task.title, task.description]);

  const commitTitle = () => {
    if (title !== task.title) onPatch({ title });
  };
  const commitDescription = () => {
    const next = description.trim() ? description : null;
    if (next !== task.description) onPatch({ description: next });
  };

  const toggleAssignee = (userId: string) => {
    const next = task.assigneeIds.includes(userId)
      ? task.assigneeIds.filter((id) => id !== userId)
      : [...task.assigneeIds, userId];
    onPatch({ assigneeIds: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-start gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            placeholder="Task title"
            aria-label="Task title"
            className={cn(inputCls, "flex-1 font-medium")}
          />
          <button
            onClick={() => {
              // Commit pending edits before unmounting, or blur never fires.
              commitTitle();
              commitDescription();
              onClose();
            }}
            aria-label="Close"
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          placeholder="Add a description…"
          rows={3}
          aria-label="Description"
          className={cn(inputCls, "mb-3 resize-none")}
        />

        <div className="mb-3">
          <span className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Priority</span>
          <div className="flex gap-1.5">
            {PRIORITY_ORDER.map((p) => {
              const selected = task.priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  // Clicking the active priority clears it, so a task can go
                  // back to having none.
                  onClick={() => onPatch({ priority: selected ? null : p })}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? "border-current " + PRIORITY_META[p].chip
                      : "border-gray-300 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400",
                  )}
                >
                  <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_META[p].dot)} />
                  {PRIORITY_META[p].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">
            Start
            <input
              type="date"
              value={task.startDate ?? ""}
              max={task.dueDate ?? undefined}
              onChange={(e) => onPatch({ startDate: e.target.value || null })}
              className={cn(inputCls, "mt-1")}
            />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400">
            Due
            <input
              type="date"
              value={task.dueDate ?? ""}
              min={task.startDate ?? undefined}
              onChange={(e) => onPatch({ dueDate: e.target.value || null })}
              className={cn(inputCls, "mt-1")}
            />
          </label>
        </div>

        {members.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Assignees</p>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const selected = task.assigneeIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleAssignee(member.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors",
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-600/20 dark:text-blue-200"
                        : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400",
                    )}
                  >
                    <Avatar user={member} size={18} />
                    <span className="max-w-[8rem] truncate">{member.name ?? "Unknown"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="block text-xs text-gray-500 dark:text-gray-400">
          Milestone
          <select
            value={task.milestoneId ?? ""}
            onChange={(e) => onPatch({ milestoneId: e.target.value || null })}
            className={cn(inputCls, "mt-1")}
          >
            <option value="">None</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
