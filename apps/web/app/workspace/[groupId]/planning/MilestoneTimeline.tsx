"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, X, CircleCheck, TriangleAlert, Clock } from "lucide-react";
import { v4 as uuid } from "uuid";
import {
  milestoneProgress,
  milestoneRange,
  milestoneStatus,
  type Milestone,
  type MilestoneStatus,
  type PlanningContent,
} from "../../lib/usePlanningBoard";
import { buildTimelineScale, daysBetween, shiftISODate } from "../../lib/timelineScale";

interface MilestoneTimelineProps {
  content: PlanningContent;
  updateContent: (updater: (prev: PlanningContent) => PlanningContent) => void;
}

// Status drives both a colour and an icon — colour alone would be the only
// signal for readers who can't distinguish them.
const STATUS_META: Record<
  MilestoneStatus,
  { label: string; bar: string; chip: string; Icon: typeof Clock }
> = {
  done: {
    label: "Done",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    Icon: CircleCheck,
  },
  overdue: {
    label: "Overdue",
    bar: "bg-red-500",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    Icon: TriangleAlert,
  },
  "at-risk": {
    label: "At risk",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Icon: TriangleAlert,
  },
  "on-track": {
    label: "On track",
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    Icon: Clock,
  },
};

const inputCls =
  "rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export default function MilestoneTimeline({ content, updateContent }: MilestoneTimelineProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const allCards = Object.values(content.cards);
  const sorted = useMemo(
    () =>
      [...content.milestones].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      ),
    [content.milestones],
  );

  const scale = useMemo(
    () =>
      buildTimelineScale(
        sorted.flatMap((m) => {
          const { start, end } = milestoneRange(m);
          return [start, end];
        }),
      ),
    [sorted],
  );

  const patchMilestone = (id: string, patch: Partial<Milestone>) => {
    updateContent((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const addMilestone = () => {
    if (!newTitle.trim() || !newDueDate) return;
    updateContent((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { id: uuid(), title: newTitle.trim(), dueDate: newDueDate, cardIds: [] },
      ],
    }));
    setNewTitle("");
    setNewDueDate("");
  };

  const deleteMilestone = (id: string) => {
    updateContent((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
  };

  const toggleCard = (milestoneId: string, cardId: string) => {
    updateContent((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              cardIds: m.cardIds.includes(cardId)
                ? m.cardIds.filter((id) => id !== cardId)
                : [...m.cardIds, cardId],
            }
          : m,
      ),
    }));
  };

  // ── Drag to reschedule (desktop only) ──────────────────────────────────
  // Converts horizontal travel into whole days using the same scale the bars
  // are drawn with, so a bar always lands where the cursor left it.
  const startBarDrag = (m: Milestone, e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const trackWidth = track.getBoundingClientRect().width;
    const spanDays = (scale.endMs - scale.startMs) / 86_400_000;
    const startX = e.clientX;
    const { start, end } = milestoneRange(m);
    const duration = daysBetween(start, end);
    let lastDelta = 0;

    const onMove = (ev: PointerEvent) => {
      const deltaDays = Math.round(((ev.clientX - startX) / trackWidth) * spanDays);
      if (deltaDays === lastDelta) return;
      lastDelta = deltaDays;
      const nextStart = shiftISODate(start, deltaDays);
      patchMilestone(m.id, {
        startDate: duration > 0 ? nextStart : undefined,
        dueDate: shiftISODate(nextStart, duration),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const rows = sorted.map((m) => {
    const progress = milestoneProgress(m, content);
    return { m, progress, status: milestoneStatus(m, progress) };
  });

  return (
    <div className="space-y-4 p-3 sm:p-6">
      {/* Add form — stacks on narrow screens rather than overflowing. */}
      <div className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/60 sm:flex-row">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Milestone name"
          className={`flex-1 ${inputCls}`}
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className={inputCls}
        />
        <button
          onClick={addMilestone}
          className="flex items-center justify-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-gray-500">No milestones yet.</p>
      )}

      {/* ── Desktop: date-scaled Gantt ─────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="hidden md:block">
          <div className="relative mb-1 h-5 border-b border-gray-200 dark:border-gray-700">
            {scale.ticks.map((tick) => (
              <span
                key={tick.label}
                className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500"
                style={{ left: `${tick.pct}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          <div ref={trackRef} className="relative space-y-2">
            {rows.map(({ m, progress, status }) => {
              const { start, end } = milestoneRange(m);
              const left = scale.toPct(start);
              const meta = STATUS_META[status];
              // Floor the width so a same-day milestone stays grabbable.
              const width = Math.max(scale.toPct(end) - left, 2);
              return (
                <div key={m.id} className="group relative h-9">
                  <div
                    onPointerDown={(e) => startBarDrag(m, e)}
                    onDoubleClick={() => setEditing(m.id)}
                    title={`${m.title} · ${start} → ${end} — drag to reschedule, double-click to edit`}
                    className={`absolute top-0 flex h-9 cursor-grab items-center overflow-hidden rounded active:cursor-grabbing ${meta.bar}`}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: 96 }}
                  >
                    {/* Progress fill sits inside the bar. */}
                    {progress !== null && (
                      <div
                        className="absolute inset-y-0 left-0 bg-black/25"
                        style={{ width: `${progress * 100}%` }}
                      />
                    )}
                    <span className="relative truncate px-2 text-xs font-medium text-white">
                      {m.title}
                      {progress !== null && ` · ${Math.round(progress * 100)}%`}
                    </span>
                  </div>
                  {/* Keeps edit/delete reachable without knowing about the
                      double-click. Sits after the bar so it stays clickable. */}
                  <button
                    onClick={() => setEditing(m.id)}
                    className="absolute top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] text-gray-500 opacity-0 hover:text-gray-900 group-hover:opacity-100 dark:hover:text-white"
                    style={{ left: `calc(${left}% + max(${width}%, 96px) + 6px)` }}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile: card list. A phone-width Gantt is unreadable. ──────── */}
      <div className="space-y-3 md:hidden">
        {rows.map(({ m, progress, status }) => {
          const { start, end } = milestoneRange(m);
          const meta = STATUS_META[status];
          return (
            <div
              key={m.id}
              className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {m.title}
                  </p>
                  <p className="text-xs text-gray-500">{start === end ? end : `${start} → ${end}`}</p>
                </div>
                <button
                  onClick={() => deleteMilestone(m.id)}
                  aria-label="Delete milestone"
                  className="shrink-0 p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
                >
                  <meta.Icon size={11} /> {meta.label}
                </span>
                {progress !== null && (
                  <span className="text-[11px] text-gray-500">{Math.round(progress * 100)}%</span>
                )}
              </div>

              {progress !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className={`h-full ${meta.bar}`} style={{ width: `${progress * 100}%` }} />
                </div>
              )}

              <button
                onClick={() => setEditing(editing === m.id ? null : m.id)}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400"
              >
                {editing === m.id ? "Close" : "Edit dates & tasks"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Shared edit sheet — precise date entry beats dragging on a phone, and
          gives desktop a keyboard path to the same fields. */}
      {editing && (
        <MilestoneEditor
          milestone={sorted.find((m) => m.id === editing)!}
          allCards={allCards}
          onPatch={(patch) => patchMilestone(editing, patch)}
          onToggleCard={(cardId) => toggleCard(editing, cardId)}
          onDelete={() => {
            deleteMilestone(editing);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MilestoneEditor({
  milestone,
  allCards,
  onPatch,
  onToggleCard,
  onDelete,
  onClose,
}: {
  milestone: Milestone;
  allCards: { id: string; title: string }[];
  onPatch: (patch: Partial<Milestone>) => void;
  onToggleCard: (cardId: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { start, end } = milestoneRange(milestone);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <input
            value={milestone.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            className={`flex-1 ${inputCls}`}
          />
          <button onClick={onClose} aria-label="Close" className="ml-2 p-1 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">
            Start
            <input
              type="date"
              value={start}
              max={end}
              onChange={(e) => onPatch({ startDate: e.target.value })}
              className={`mt-1 w-full ${inputCls}`}
            />
          </label>
          <label className="text-xs text-gray-500">
            Due
            <input
              type="date"
              value={end}
              onChange={(e) => onPatch({ dueDate: e.target.value })}
              className={`mt-1 w-full ${inputCls}`}
            />
          </label>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(milestone.done)}
            onChange={(e) => onPatch({ done: e.target.checked })}
            className="accent-blue-600"
          />
          Mark as done
        </label>

        {allCards.length > 0 && (
          <>
            <p className="mb-1.5 text-xs font-medium text-gray-500">
              Linked tasks — progress is derived from these
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {allCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => onToggleCard(card.id)}
                  className={`rounded-full border px-2 py-1 text-[11px] ${
                    milestone.cardIds.includes(card.id)
                      ? "border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-200"
                      : "border-gray-300 text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {card.title || "Untitled task"}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onDelete}
          className="w-full rounded border border-red-300 py-2 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
        >
          Delete milestone
        </button>
      </div>
    </div>
  );
}
