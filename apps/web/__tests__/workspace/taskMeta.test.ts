import { describe, it, expect } from "vitest";
import {
  columnKind,
  EMPTY_STATES,
  PRIORITY_META,
  PRIORITY_ORDER,
  defaultColumnColor,
} from "../../app/workspace/lib/taskMeta";

describe("columnKind", () => {
  it("recognises planning columns", () => {
    for (const t of ["To Plan", "Planning", "To Do", "Backlog", "New ideas"]) {
      expect(columnKind(t)).toBe("todo");
    }
  });

  it("recognises in-progress columns", () => {
    for (const t of ["In Progress", "Doing", "Active", "In Review", "Current sprint"]) {
      expect(columnKind(t)).toBe("progress");
    }
  });

  it("recognises done columns", () => {
    for (const t of ["Completed", "Done", "Shipped", "Finished"]) {
      expect(columnKind(t)).toBe("done");
    }
  });

  it("is case-insensitive", () => {
    expect(columnKind("COMPLETED")).toBe("done");
    expect(columnKind("in progress")).toBe("progress");
  });

  it("falls back to generic for an unrecognised title", () => {
    expect(columnKind("Week 1")).toBe("generic");
    expect(columnKind("12-15 aug")).toBe("generic");
    expect(columnKind("")).toBe("generic");
  });

  it("prefers done over progress when a title suggests both", () => {
    // "Review complete" is finished work, not work in review.
    expect(columnKind("Review complete")).toBe("done");
  });

  it("has copy and a colour for every kind", () => {
    for (const kind of ["todo", "progress", "done", "generic"] as const) {
      expect(EMPTY_STATES[kind].title).toBeTruthy();
      expect(EMPTY_STATES[kind].body).toBeTruthy();
      expect(defaultColumnColor(kind)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("priority metadata", () => {
  it("orders priorities most urgent first", () => {
    expect(PRIORITY_ORDER).toEqual(["HIGH", "MEDIUM", "LOW"]);
  });

  it("has a label, dot and chip for each", () => {
    for (const p of PRIORITY_ORDER) {
      expect(PRIORITY_META[p].label).toBeTruthy();
      expect(PRIORITY_META[p].dot).toContain("bg-");
      expect(PRIORITY_META[p].chip).toContain("text-");
    }
  });

  it("gives each priority a distinct colour", () => {
    const dots = PRIORITY_ORDER.map((p) => PRIORITY_META[p].dot);
    expect(new Set(dots).size).toBe(dots.length);
  });
});
