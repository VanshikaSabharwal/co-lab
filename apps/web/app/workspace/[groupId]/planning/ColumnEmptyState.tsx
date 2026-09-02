"use client";

import React from "react";
import { Activity, CheckCircle2, ClipboardList, Plus, Inbox } from "lucide-react";
import { EMPTY_STATES, type ColumnKind } from "../../lib/taskMeta";
import { cn } from "../../../lib/utils";

const ICONS: Record<ColumnKind, typeof Inbox> = {
  todo: ClipboardList,
  progress: Activity,
  done: CheckCircle2,
  generic: Inbox,
};

interface ColumnEmptyStateProps {
  kind: ColumnKind;
  onAddTask: () => void;
  /** True when a search is filtering the board, not when the column is empty. */
  filtered?: boolean;
}

export default function ColumnEmptyState({ kind, onAddTask, filtered }: ColumnEmptyStateProps) {
  // A search that matched nothing isn't the same as an empty column — offering
  // "add your first task" there would be misleading.
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">No matching tasks</p>
      </div>
    );
  }

  const copy = EMPTY_STATES[kind];
  const Icon = ICONS[kind];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <span
        aria-hidden
        className={cn("mb-4 flex h-16 w-16 items-center justify-center rounded-full", copy.accent)}
      >
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.title}</p>
      <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {copy.body}
      </p>
      <button
        onClick={onAddTask}
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors",
          copy.action,
        )}
      >
        <Plus size={13} />
        Add your first task
      </button>
    </div>
  );
}
