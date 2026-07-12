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
  dueDate: string;
  cardIds: string[];
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

  const applyRemoteOp = useCallback((op: { content: PlanningContent }) => {
    setContent(op.content);
  }, []);

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
  }, [groupId, userId]);

  useEffect(() => {
    if (!loaded || !userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/workspace/${groupId}/planning`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content }),
      })
        .then((res) => res.json())
        .then((data) => setUpdatedAt(data.updatedAt ?? null))
        .catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [content, loaded, groupId, userId]);

  const updateContent = useCallback(
    (updater: (prev: PlanningContent) => PlanningContent) => {
      setContent((prev) => {
        const next = updater(prev);
        sendOp({ content: next });
        return next;
      });
    },
    [sendOp],
  );

  return { content, loaded, updatedAt, isConnected, presence, updateContent };
}
