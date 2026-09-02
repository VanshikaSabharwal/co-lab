import { describe, it, expect } from "vitest";
import {
  buildBackfillPlan,
  POSITION_STEP,
  type LegacyPlanningContent,
} from "../../app/workspace/lib/planningBackfill";

const blob = (over: Partial<LegacyPlanningContent> = {}): LegacyPlanningContent => ({
  columns: [
    { id: "c1", title: "Backlog", cardIds: ["a", "b"] },
    { id: "c2", title: "Done", cardIds: ["c"] },
  ],
  cards: {
    a: { id: "a", title: "Task A" },
    b: { id: "b", title: "Task B", description: "desc" },
    c: { id: "c", title: "Task C" },
  },
  milestones: [],
  ...over,
});

describe("buildBackfillPlan — ordering", () => {
  it("preserves cardIds array order as gapped positions", () => {
    const { tasks } = buildBackfillPlan(blob());
    const first = tasks.filter((t) => t.legacyColumnId === "c1");
    expect(first.map((t) => t.legacyId)).toEqual(["a", "b"]);
    expect(first.map((t) => t.position)).toEqual([0, POSITION_STEP]);
  });

  it("restarts task positions per column", () => {
    const { tasks } = buildBackfillPlan(blob());
    expect(tasks.find((t) => t.legacyId === "c")!.position).toBe(0);
  });

  it("orders columns by their array index", () => {
    const { columns } = buildBackfillPlan(blob());
    expect(columns.map((c) => c.legacyId)).toEqual(["c1", "c2"]);
    expect(columns.map((c) => c.position)).toEqual([0, POSITION_STEP]);
  });
});

describe("buildBackfillPlan — no data loss", () => {
  it("carries every card across", () => {
    const { tasks } = buildBackfillPlan(blob());
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.legacyId).sort()).toEqual(["a", "b", "c"]);
  });

  it("keeps descriptions, and nulls a missing one", () => {
    const { tasks } = buildBackfillPlan(blob());
    expect(tasks.find((t) => t.legacyId === "b")!.description).toBe("desc");
    expect(tasks.find((t) => t.legacyId === "a")!.description).toBeNull();
  });

  it("preserves the empty titles the old board allowed", () => {
    const { tasks } = buildBackfillPlan(
      blob({ cards: { a: { id: "a", title: "" } }, columns: [{ id: "c1", cardIds: ["a"] }] }),
    );
    expect(tasks[0]!.title).toBe("");
  });

  it("reports cards referenced by a column but absent from cards", () => {
    const plan = buildBackfillPlan(
      blob({ columns: [{ id: "c1", title: "X", cardIds: ["a", "ghost"] }] }),
    );
    expect(plan.orphanedCardIds).toEqual(["ghost"]);
    expect(plan.tasks).toHaveLength(1);
  });

  it("inserts a card shared by two columns only once", () => {
    const plan = buildBackfillPlan(
      blob({
        columns: [
          { id: "c1", title: "X", cardIds: ["a"] },
          { id: "c2", title: "Y", cardIds: ["a"] },
        ],
      }),
    );
    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0]!.legacyColumnId).toBe("c1");
  });
});

describe("buildBackfillPlan — milestones", () => {
  const withMilestones = () =>
    blob({
      milestones: [
        { id: "m1", title: "Alpha", dueDate: "2026-06-01", cardIds: ["a", "b"] },
        { id: "m2", title: "Beta", dueDate: "2026-07-01", startDate: "2026-06-15", cardIds: [] },
      ],
    });

  it("links tasks to their milestone", () => {
    const { tasks } = buildBackfillPlan(withMilestones());
    expect(tasks.find((t) => t.legacyId === "a")!.legacyMilestoneId).toBe("m1");
    expect(tasks.find((t) => t.legacyId === "c")!.legacyMilestoneId).toBeNull();
  });

  it("keeps a valid start date and drops one after the due date", () => {
    const { milestones } = buildBackfillPlan(withMilestones());
    expect(milestones.find((m) => m.legacyId === "m2")!.startDate).toBe("2026-06-15");

    const bad = buildBackfillPlan(
      blob({ milestones: [{ id: "m1", dueDate: "2026-06-01", startDate: "2026-09-01" }] }),
    );
    expect(bad.milestones[0]!.startDate).toBeNull();
  });

  it("assigns a card claimed by two milestones to the first", () => {
    const { tasks } = buildBackfillPlan(
      blob({
        milestones: [
          { id: "m1", dueDate: "2026-06-01", cardIds: ["a"] },
          { id: "m2", dueDate: "2026-07-01", cardIds: ["a"] },
        ],
      }),
    );
    expect(tasks.find((t) => t.legacyId === "a")!.legacyMilestoneId).toBe("m1");
  });

  it("skips milestones whose due date is missing or malformed", () => {
    const { milestones } = buildBackfillPlan(
      blob({
        milestones: [
          { id: "ok", dueDate: "2026-06-01" },
          { id: "empty", dueDate: "" },
          { id: "garbage", dueDate: "not-a-date" },
          { id: "impossible", dueDate: "2026-13-45" },
          { id: "missing" },
        ],
      }),
    );
    expect(milestones.map((m) => m.legacyId)).toEqual(["ok"]);
  });

  it("defaults done to false", () => {
    const { milestones } = buildBackfillPlan(
      blob({ milestones: [{ id: "m1", dueDate: "2026-06-01" }] }),
    );
    expect(milestones[0]!.done).toBe(false);
  });
});

describe("buildBackfillPlan — malformed input", () => {
  it("returns empty plans for null, undefined and an empty object", () => {
    for (const input of [null, undefined, {}]) {
      const plan = buildBackfillPlan(input as LegacyPlanningContent);
      expect(plan.columns).toEqual([]);
      expect(plan.tasks).toEqual([]);
      expect(plan.milestones).toEqual([]);
    }
  });

  it("survives wrong types where arrays were expected", () => {
    const plan = buildBackfillPlan({
      columns: "nope",
      cards: null,
      milestones: 42,
    } as unknown as LegacyPlanningContent);
    expect(plan.columns).toEqual([]);
    expect(plan.tasks).toEqual([]);
  });

  it("skips columns with no id and substitutes a placeholder title", () => {
    const plan = buildBackfillPlan({
      columns: [{ title: "No id" }, { id: "c1" }],
      cards: {},
      milestones: [],
    });
    expect(plan.columns).toHaveLength(1);
    expect(plan.columns[0]!.title).toBe("Untitled");
  });
});
