import { describe, it, expect } from "vitest";
import {
  milestoneProgress,
  milestoneRange,
  milestoneStatus,
  type Milestone,
  type PlanningContent,
} from "../../app/workspace/lib/usePlanningBoard";

function content(overrides: Partial<PlanningContent> = {}): PlanningContent {
  return {
    columns: [
      { id: "todo", title: "Backlog", cardIds: ["a", "b"] },
      { id: "done", title: "Done", cardIds: ["c", "d"] },
    ],
    cards: {
      a: { id: "a", title: "A" },
      b: { id: "b", title: "B" },
      c: { id: "c", title: "C" },
      d: { id: "d", title: "D" },
    },
    milestones: [],
    ...overrides,
  };
}

const milestone = (over: Partial<Milestone> = {}): Milestone => ({
  id: "m1",
  title: "M",
  dueDate: "2026-06-01",
  cardIds: [],
  ...over,
});

describe("milestoneProgress", () => {
  it("returns null when no cards are linked, distinguishing untracked from 0%", () => {
    expect(milestoneProgress(milestone(), content())).toBeNull();
  });

  it("counts only linked cards sitting in the done column", () => {
    expect(milestoneProgress(milestone({ cardIds: ["a", "c"] }), content())).toBe(0.5);
    expect(milestoneProgress(milestone({ cardIds: ["c", "d"] }), content())).toBe(1);
    expect(milestoneProgress(milestone({ cardIds: ["a", "b"] }), content())).toBe(0);
  });

  it("matches a done column by name regardless of position or case", () => {
    const c = content({
      columns: [
        { id: "shipped", title: "SHIPPED", cardIds: ["a"] },
        { id: "wip", title: "In Progress", cardIds: ["b"] },
      ],
    });
    expect(milestoneProgress(milestone({ cardIds: ["a", "b"] }), c)).toBe(0.5);
  });

  it("falls back to the last column when nothing matches the done pattern", () => {
    const c = content({
      columns: [
        { id: "one", title: "Ideas", cardIds: ["a"] },
        { id: "two", title: "Final", cardIds: ["b"] },
      ],
    });
    expect(milestoneProgress(milestone({ cardIds: ["b"] }), c)).toBe(1);
  });

  it("ignores linked cards that no longer exist in any column", () => {
    expect(milestoneProgress(milestone({ cardIds: ["c", "ghost"] }), content())).toBe(0.5);
  });
});

describe("milestoneStatus", () => {
  const now = new Date("2026-06-01T12:00:00");

  it("reports done when explicitly flagged or fully complete", () => {
    expect(milestoneStatus(milestone({ done: true }), 0, now)).toBe("done");
    expect(milestoneStatus(milestone(), 1, now)).toBe("done");
  });

  it("reports overdue once the due date has passed and work remains", () => {
    expect(milestoneStatus(milestone({ dueDate: "2026-05-01" }), 0.5, now)).toBe("overdue");
  });

  it("reports at-risk when due soon with less than half done", () => {
    expect(milestoneStatus(milestone({ dueDate: "2026-06-04" }), 0.2, now)).toBe("at-risk");
  });

  it("stays on-track when due soon but mostly complete", () => {
    expect(milestoneStatus(milestone({ dueDate: "2026-06-04" }), 0.8, now)).toBe("on-track");
  });

  it("treats an untracked milestone far out as on-track", () => {
    expect(milestoneStatus(milestone({ dueDate: "2026-12-01" }), null, now)).toBe("on-track");
  });
});

describe("milestoneRange", () => {
  it("collapses to a point when no start date is set", () => {
    expect(milestoneRange(milestone())).toEqual({
      start: "2026-06-01",
      end: "2026-06-01",
    });
  });

  it("uses the start date when it precedes the due date", () => {
    const r = milestoneRange(milestone({ startDate: "2026-05-01" }));
    expect(r).toEqual({ start: "2026-05-01", end: "2026-06-01" });
  });

  it("ignores a start date that is after the due date", () => {
    const r = milestoneRange(milestone({ startDate: "2026-07-01" }));
    expect(r.start).toBe("2026-06-01");
  });
});
