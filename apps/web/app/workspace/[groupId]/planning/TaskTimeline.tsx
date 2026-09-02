"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import AvatarStack from "../../components/AvatarStack";
import type { AvatarUser } from "../../components/Avatar";
import type { PlanningColumn, PlanningTask } from "../../lib/usePlanningData";
import { barSpanFor, buildMonthGrid, shiftMonth, todayIndex } from "../../lib/monthGrid";
import { findDoneColumn } from "../../lib/boardProgress";
import { PRIORITY_META } from "../../lib/taskMeta";
import { cn } from "../../../lib/utils";

interface TaskTimelineProps {
  tasks: PlanningTask[];
  columns: PlanningColumn[];
  members: Map<string, AvatarUser>;
  onOpenTask: (task: PlanningTask) => void;
}

const DAY_MIN_WIDTH = 34;

const BAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function colorForTask(task: PlanningTask, index: number): string {
  return task.color ?? BAR_COLORS[index % BAR_COLORS.length]!;
}

function formatRange(start: string | null, due: string | null): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    });
  if (start && due && start !== due) return `${fmt(start)} – ${fmt(due)}`;
  return fmt((due ?? start)!);
}

/**
 * Day-scaled Gantt over one month.
 *
 * Pins the domain to the visible month rather than auto-fitting the data, so
 * a day column keeps a constant width while paging. Tasks without dates are
 * listed separately instead of being silently dropped.
 */
export default function TaskTimeline({ tasks, columns, members, onOpenTask }: TaskTimelineProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  });

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const nowIndex = todayIndex(grid);
  const doneColumnId = useMemo(() => findDoneColumn(columns)?.id ?? null, [columns]);

  const { scheduled, unscheduled } = useMemo(() => {
    const s: { task: PlanningTask; span: NonNullable<ReturnType<typeof barSpanFor>> }[] = [];
    const u: PlanningTask[] = [];
    for (const task of tasks) {
      if (!task.startDate && !task.dueDate) {
        u.push(task);
        continue;
      }
      const span = barSpanFor(grid, task.startDate, task.dueDate);
      if (span) s.push({ task, span });
    }
    return { scheduled: s, unscheduled: u };
  }, [tasks, grid]);

  const gridTemplate = `repeat(${grid.days.length}, minmax(${DAY_MIN_WIDTH}px, 1fr))`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800 sm:px-4">
        <button
          onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
          aria-label="Previous month"
          className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={15} />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{grid.label}</h2>
        <button
          onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
          aria-label="Next month"
          className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max px-3 pb-4 sm:px-4">
          {/* Day ruler */}
          <div
            className="sticky top-0 z-10 grid border-b border-gray-200 bg-white py-1.5 dark:border-gray-800 dark:bg-gray-950"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {grid.days.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "text-center text-[10px] tabular-nums",
                  i === nowIndex
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-600",
                )}
              >
                {day.slice(8)}
              </div>
            ))}
          </div>

          <div className="relative">
            {/* Today marker, drawn behind the bars */}
            {nowIndex >= 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-0 bg-blue-500/10"
                style={{
                  left: `${(nowIndex / grid.days.length) * 100}%`,
                  width: `${(1 / grid.days.length) * 100}%`,
                }}
              />
            )}

            {scheduled.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-600">
                No tasks scheduled in {grid.label}.
              </p>
            )}

            {scheduled.map(({ task, span }, i) => {
              const assignees = task.assigneeIds
                .map((id) => members.get(id))
                .filter((u): u is AvatarUser => Boolean(u));
              const done = doneColumnId !== null && task.columnId === doneColumnId;

              return (
                <div
                  key={task.id}
                  className="relative grid h-11 items-center"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <button
                    onClick={() => onOpenTask(task)}
                    title={[
                      task.title || "Untitled task",
                      formatRange(task.startDate, task.dueDate),
                      task.priority ? `${PRIORITY_META[task.priority].label} priority` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    style={{ gridColumn: `${span.startIndex + 1} / span ${span.span}` }}
                    className={cn(
                      "relative z-[1] flex h-8 items-center gap-1.5 overflow-hidden px-2 text-left text-white shadow-sm transition-opacity hover:opacity-90",
                      colorForTask(task, i),
                      done && "opacity-60",
                      // Square off a clipped edge so it reads as continuing.
                      span.clippedStart ? "rounded-l-none" : "rounded-l-md",
                      span.clippedEnd ? "rounded-r-none" : "rounded-r-md",
                    )}
                  >
                    {/* Same priority signal the board cards carry, so the two
                        views agree at a glance. */}
                    {task.priority && (
                      <span
                        aria-label={`${PRIORITY_META[task.priority].label} priority`}
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80"
                      />
                    )}
                    <span className="truncate text-xs font-medium">
                      {task.title || "Untitled task"}
                    </span>
                    {assignees.length > 0 && (
                      <span className="ml-auto shrink-0">
                        <AvatarStack users={assignees} size={18} max={2} />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {unscheduled.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <CalendarDays size={12} />
                {unscheduled.length} task{unscheduled.length === 1 ? "" : "s"} without dates
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unscheduled.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-blue-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
                  >
                    {task.title || "Untitled task"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
