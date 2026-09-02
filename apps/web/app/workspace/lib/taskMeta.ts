import type { PlanningPriority } from "./usePlanningData";

/**
 * Presentation rules shared by the board, the timeline and the dialogs, so a
 * priority or an empty column never looks different in two places.
 */

export const PRIORITY_ORDER: PlanningPriority[] = ["HIGH", "MEDIUM", "LOW"];

export const PRIORITY_META: Record<
  PlanningPriority,
  { label: string; dot: string; chip: string }
> = {
  HIGH: {
    label: "High",
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  MEDIUM: {
    label: "Medium",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  LOW: {
    label: "Low",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

/**
 * Which flavour of empty state a column shows.
 *
 * Matched on the column's title rather than its position, so reordering or
 * inserting a column doesn't relabel the others. Anything unrecognised falls
 * back to "generic" — no column is ever left blank.
 */
export type ColumnKind = "todo" | "progress" | "done" | "generic";

export function columnKind(title: string): ColumnKind {
  const t = title.toLowerCase();
  // Checked before "todo": "in progress" contains neither, but titles like
  // "Ready to plan" would otherwise fall through inconsistently.
  if (/done|complete|shipped|finish/.test(t)) return "done";
  if (/progress|doing|active|current|review/.test(t)) return "progress";
  if (/plan|todo|to.do|backlog|idea|new/.test(t)) return "todo";
  return "generic";
}

export interface EmptyStateCopy {
  title: string;
  body: string;
  /** Tailwind classes for the illustration circle. */
  accent: string;
  action: string;
}

export const EMPTY_STATES: Record<ColumnKind, EmptyStateCopy> = {
  todo: {
    title: "Nothing planned yet",
    body: "Add tasks here to start planning your milestones.",
    accent: "bg-purple-500/10 text-purple-500 dark:text-purple-400",
    action: "bg-purple-600 hover:bg-purple-500",
  },
  progress: {
    title: "No tasks in progress",
    body: "Tasks you're working on will appear here.",
    accent: "bg-blue-500/10 text-blue-500 dark:text-blue-400",
    action: "bg-blue-600 hover:bg-blue-500",
  },
  done: {
    title: "No completed tasks",
    body: "Completed tasks will be shown here.",
    accent: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
    action: "bg-emerald-600 hover:bg-emerald-500",
  },
  generic: {
    title: "No tasks yet",
    body: "Add your first task to this column.",
    accent: "bg-gray-500/10 text-gray-400",
    action: "bg-blue-600 hover:bg-blue-500",
  },
};

/** Default dot colour for a column that has none set. */
export function defaultColumnColor(kind: ColumnKind): string {
  switch (kind) {
    case "todo":
      return "#a78bfa";
    case "progress":
      return "#60a5fa";
    case "done":
      return "#34d399";
    default:
      return "#94a3b8";
  }
}
