"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSocket } from "./useWorkspaceSocket";

export interface PlanningCard {
  id: string;
  title: string;
  description?: string;
}

export interface PlanningColumn {
  id: string;
  title: string;
  cardIds: string[];
}

export interface Milestone {
  id: string;
  title: string;
  /** End of the milestone. Kept as the required field — existing rows have it. */
  dueDate: string;
  cardIds: string[];
  /** Optional start. Absent means a zero-duration marker at `dueDate`. */
  startDate?: string;
  done?: boolean;
}

/** Milestones saved before start dates existed collapse to a point in time. */
export function milestoneRange(m: Milestone): { start: string; end: string } {
  const start = m.startDate && m.startDate <= m.dueDate ? m.startDate : m.dueDate;
  return { start, end: m.dueDate };
}

/**
 * Fraction of a milestone's linked cards that have reached a "done" column.
 * Returns null when nothing is linked, so callers can distinguish "no progress"
 * from "not tracked".
 */
export function milestoneProgress(m: Milestone, content: PlanningContent): number | null {
  if (m.cardIds.length === 0) return null;
  const doneColumn =
    content.columns.find((c) => /done|complete|shipped/i.test(c.title)) ??
    content.columns[content.columns.length - 1];
  if (!doneColumn) return null;
  const doneIds = new Set(doneColumn.cardIds);
  const completed = m.cardIds.filter((id) => doneIds.has(id)).length;
  return completed / m.cardIds.length;
}

export type MilestoneStatus = "done" | "overdue" | "at-risk" | "on-track";

const DAY_MS = 86_400_000;
const AT_RISK_DAYS = 7;

export function milestoneStatus(
  m: Milestone,
  progress: number | null,
  now: Date = new Date(),
): MilestoneStatus {
  if (m.done || progress === 1) return "done";
  const due = new Date(`${m.dueDate}T00:00:00`).getTime();
  const daysLeft = (due - now.getTime()) / DAY_MS;
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= AT_RISK_DAYS && (progress ?? 0) < 0.5) return "at-risk";
  return "on-track";
}

export interface PlanningContent {
  columns: PlanningColumn[];
  cards: Record<string, PlanningCard>;
  milestones: Milestone[];
}

export const DEFAULT_PLANNING_CONTENT: PlanningContent = {
  columns: [
    { id: "backlog", title: "Backlog", cardIds: [] },
    { id: "in-progress", title: "In Progress", cardIds: [] },
    { id: "done", title: "Done", cardIds: [] },
  ],
  cards: {},
  milestones: [],
};

const SAVE_DEBOUNCE_MS = 1500;
// Server cap is 8_000 bytes for the whole frame; leave headroom for the
// envelope ({type, groupId, board, op}) wrapped around the content.
const MAX_OP_BYTES = 7_000;

// Planning board's content (columns/cards/milestones) isn't a node graph, so
// it doesn't reuse useWorkspaceBoard — but it shares the same load/save/sync
// shell, broadcasting the full updated content as the op on every change
// since drag-and-drop naturally produces a whole-board next state.
export function usePlanningBoard({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string | undefined;
}) {
  const [content, setContent] = useState<PlanningContent>(DEFAULT_PLANNING_CONTENT);
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped when a peer signals "invalidate" — re-runs the load effect.
  const [refetchToken, setRefetchToken] = useState(0);
  // Set when our own op was too large to broadcast: peers were told to
  // re-fetch, so we must persist immediately rather than after the debounce.
  const [pendingImmediateSave, setPendingImmediateSave] = useState(false);

  // Peers send either the whole content, or — when it grew past the wire cap —
  // an "invalidate" telling us to re-fetch the authoritative copy.
  const applyRemoteOp = useCallback(
    (op: { content?: PlanningContent; action?: string }) => {
      if (op.action === "invalidate") {
        setRefetchToken((t) => t + 1);
        return;
      }
      if (op.content) setContent(op.content);
    },
    [],
  );

  const { isConnected, presence, sendOp } = useWorkspaceSocket({
    groupId,
    board: "PLANNING",
    userId,
    onRemoteOp: applyRemoteOp,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/workspace/${groupId}/planning?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setContent(data.content ?? DEFAULT_PLANNING_CONTENT);
        setUpdatedAt(data.updatedAt ?? null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, userId, refetchToken]);

  useEffect(() => {
    if (!loaded || !userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // A too-large op told peers to re-fetch, so the server copy has to be
    // current now — skip the debounce for that write.
    const delay = pendingImmediateSave ? 0 : SAVE_DEBOUNCE_MS;
    if (pendingImmediateSave) setPendingImmediateSave(false);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/workspace/${groupId}/planning`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content }),
      })
        .then((res) => res.json())
        .then((data) => setUpdatedAt(data.updatedAt ?? null))
        .catch(() => {});
    }, delay);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [content, loaded, groupId, userId, pendingImmediateSave]);

  const updateContent = useCallback(
    (updater: (prev: PlanningContent) => PlanningContent) => {
      setContent((prev) => {
        const next = updater(prev);
        // This board broadcasts whole content rather than deltas, so a large
        // board eventually exceeds the server's 8KB per-message cap. The server
        // answers {type:"error"} and drops it — which this client ignores — so
        // sync would fail silently. Past the threshold, tell peers to re-fetch
        // instead of shipping a payload that will be rejected.
        if (JSON.stringify(next).length > MAX_OP_BYTES) {
          setPendingImmediateSave(true);
          sendOp({ action: "invalidate" });
        } else {
          sendOp({ content: next });
        }
        return next;
      });
    },
    [sendOp],
  );

  return { content, loaded, updatedAt, isConnected, presence, updateContent };
}
