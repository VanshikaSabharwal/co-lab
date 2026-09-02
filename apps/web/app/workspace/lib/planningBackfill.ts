/**
 * Transforms a legacy PLANNING `WorkspaceBoard.content` blob into the rows the
 * relational planning models expect.
 *
 * Kept pure and free of Prisma so the mapping — the part that silently loses
 * data if it's wrong — can be unit-tested without a database.
 */

/** The legacy blob shape. Every field is treated as untrusted. */
export interface LegacyPlanningContent {
  columns?: { id?: string; title?: string; cardIds?: string[] }[];
  cards?: Record<string, { id?: string; title?: string; description?: string }>;
  milestones?: {
    id?: string;
    title?: string;
    dueDate?: string;
    startDate?: string;
    done?: boolean;
    cardIds?: string[];
  }[];
}

export interface BackfillColumn {
  legacyId: string;
  title: string;
  position: number;
}

export interface BackfillTask {
  legacyId: string;
  legacyColumnId: string;
  title: string;
  description: string | null;
  position: number;
  legacyMilestoneId: string | null;
}

export interface BackfillMilestone {
  legacyId: string;
  title: string;
  startDate: string | null;
  dueDate: string;
  done: boolean;
}

export interface BackfillPlan {
  columns: BackfillColumn[];
  tasks: BackfillTask[];
  milestones: BackfillMilestone[];
  /** Card ids referenced by a column but absent from `cards`. */
  orphanedCardIds: string[];
}

/**
 * Columns seeded for a group whose board was never edited.
 *
 * The old client seeded three columns locally while the server default was an
 * empty array, so an untouched board has no columns server-side. These match
 * the mockup rather than the old client's three.
 */
export const DEFAULT_COLUMNS: { title: string; color: string }[] = [
  { title: "Planning", color: "#a78bfa" },
  { title: "In Progress", color: "#60a5fa" },
  { title: "Review", color: "#fbbf24" },
  { title: "Completed", color: "#34d399" },
];

/** Gap between positions, so a row can be reordered without rewriting siblings. */
export const POSITION_STEP = 1000;

/** True for a `YYYY-MM-DD` string that names a real calendar date. */
function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(t);
}

export function buildBackfillPlan(content: LegacyPlanningContent | null | undefined): BackfillPlan {
  const cards = content?.cards ?? {};
  const legacyColumns = Array.isArray(content?.columns) ? content!.columns! : [];
  const legacyMilestones = Array.isArray(content?.milestones) ? content!.milestones! : [];

  // Card -> milestone, resolved first so tasks can carry the link inline.
  // A card listed under several milestones keeps the first; the old model
  // allowed the overlap but a task has only one milestone.
  const milestoneByCard = new Map<string, string>();
  const milestones: BackfillMilestone[] = [];

  for (const m of legacyMilestones) {
    // dueDate was required in the old type but blobs are user data, not a
    // contract — a milestone without a usable date can't be placed in time.
    if (!m || typeof m.id !== "string" || !isValidISODate(m.dueDate)) continue;
    milestones.push({
      legacyId: m.id,
      title: typeof m.title === "string" && m.title.trim() ? m.title : "Untitled milestone",
      startDate: isValidISODate(m.startDate) && m.startDate <= m.dueDate ? m.startDate : null,
      dueDate: m.dueDate,
      done: m.done === true,
    });
    for (const cardId of Array.isArray(m.cardIds) ? m.cardIds : []) {
      if (typeof cardId === "string" && !milestoneByCard.has(cardId)) {
        milestoneByCard.set(cardId, m.id);
      }
    }
  }

  const columns: BackfillColumn[] = [];
  const tasks: BackfillTask[] = [];
  const orphanedCardIds: string[] = [];
  const seenCardIds = new Set<string>();

  legacyColumns.forEach((col, colIndex) => {
    if (!col || typeof col.id !== "string") return;
    columns.push({
      legacyId: col.id,
      title: typeof col.title === "string" && col.title.trim() ? col.title : "Untitled",
      position: colIndex * POSITION_STEP,
    });

    const cardIds = Array.isArray(col.cardIds) ? col.cardIds : [];
    let taskIndex = 0;
    for (const cardId of cardIds) {
      if (typeof cardId !== "string") continue;
      const card = cards[cardId];
      if (!card) {
        orphanedCardIds.push(cardId);
        continue;
      }
      // A card id appearing in two columns would otherwise be inserted twice.
      if (seenCardIds.has(cardId)) continue;
      seenCardIds.add(cardId);

      tasks.push({
        legacyId: cardId,
        legacyColumnId: col.id!,
        // Cards were routinely created with an empty title, so "" is expected
        // here rather than exceptional.
        title: typeof card.title === "string" ? card.title : "",
        description: typeof card.description === "string" ? card.description : null,
        // Array order is the only ordering the old model had.
        position: taskIndex * POSITION_STEP,
        legacyMilestoneId: milestoneByCard.get(cardId) ?? null,
      });
      taskIndex += 1;
    }
  });

  return { columns, tasks, milestones, orphanedCardIds };
}
