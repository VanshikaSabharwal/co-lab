"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Avatar, { type AvatarUser } from "../../components/Avatar";
import type { PlanningColumn, PlanningPriority, PlanningTask } from "../../lib/usePlanningData";
import { PRIORITY_META, PRIORITY_ORDER } from "../../lib/taskMeta";
import { cn } from "../../../lib/utils";

interface CreateTaskDialogProps {
  columns: PlanningColumn[];
  members: AvatarUser[];
  /** Column the dialog opens on, from whichever "Add task" was clicked. */
  defaultColumnId: string;
  onCreate: (columnId: string, fields: Partial<PlanningTask>) => Promise<unknown>;
  onClose: () => void;
}

const fieldCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const labelCls = "mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400";

export default function CreateTaskDialog({
  columns,
  members,
  defaultColumnId,
  onCreate,
  onClose,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(defaultColumnId);
  const [priority, setPriority] = useState<PlanningPriority | "">("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  // Escape closes, matching every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSubmit = title.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const created = await onCreate(columnId, {
      title: title.trim(),
      description: description.trim() || null,
      priority: priority || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      assigneeIds,
    });
    setSubmitting(false);
    // Leave the dialog open on failure so the typed content isn't lost —
    // usePlanningData has already toasted the error.
    if (created) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-heading"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="create-task-heading"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            Create new task
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3">
          <label htmlFor="task-title" className={labelCls}>
            Task title <span className="text-rose-500">*</span>
          </label>
          <input
            id="task-title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits from the title; the textarea keeps newlines.
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Build anime character detail page"
            className={fieldCls}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="task-desc" className={labelCls}>
            Description
          </label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Create a dynamic page to display details using the API."
            className={cn(fieldCls, "resize-none")}
          />
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="task-column" className={labelCls}>
              Column
            </label>
            <select
              id="task-column"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className={fieldCls}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-priority" className={labelCls}>
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PlanningPriority | "")}
              className={fieldCls}
            >
              <option value="">None</option>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-start" className={labelCls}>
              Start date
            </label>
            <input
              id="task-start"
              type="date"
              value={startDate}
              max={dueDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldCls}
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="task-due" className={labelCls}>
            Due date
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            min={startDate || undefined}
            onChange={(e) => setDueDate(e.target.value)}
            className={fieldCls}
          />
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            A task needs at least one date to appear on the timeline.
          </p>
        </div>

        {members.length > 0 && (
          <div className="mb-5">
            <span className={labelCls}>Assign to</span>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const selected = assigneeIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      setAssigneeIds((prev) =>
                        prev.includes(member.id)
                          ? prev.filter((id) => id !== member.id)
                          : [...prev, member.id],
                      )
                    }
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

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
