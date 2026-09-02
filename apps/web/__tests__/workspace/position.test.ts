import { describe, it, expect } from "vitest";
import {
  POSITION_STEP,
  positionBetween,
  positionForMove,
  renumber,
} from "../../app/workspace/lib/position";

describe("positionBetween", () => {
  it("returns the midpoint between two neighbours", () => {
    expect(positionBetween(0, 1000)).toBe(500);
    expect(positionBetween(1000, 3000)).toBe(2000);
  });

  it("steps beyond the ends of a list", () => {
    expect(positionBetween(undefined, 0)).toBe(-POSITION_STEP);
    expect(positionBetween(2000, undefined)).toBe(3000);
  });

  it("returns 0 for an empty list", () => {
    expect(positionBetween(undefined, undefined)).toBe(0);
  });

  it("signals an exhausted gap rather than colliding", () => {
    // No integer exists strictly between these, so the caller must renumber.
    expect(positionBetween(5, 6)).toBeNull();
    expect(positionBetween(5, 5)).toBeNull();
  });

  it("still fits one more between positions two apart", () => {
    expect(positionBetween(4, 6)).toBe(5);
  });

  it("handles negative positions", () => {
    expect(positionBetween(-2000, -1000)).toBe(-1500);
  });
});

describe("positionForMove", () => {
  const list = [
    { id: "a", position: 0 },
    { id: "b", position: 1000 },
    { id: "c", position: 2000 },
  ];

  it("moves an item to the front", () => {
    expect(positionForMove(list, "c", 0)).toBe(-POSITION_STEP);
  });

  it("moves an item to the end", () => {
    // Removing "a" leaves [b, c]; index 2 is past c.
    expect(positionForMove(list, "a", 2)).toBe(3000);
  });

  it("moves an item into the middle", () => {
    // Removing "a" leaves [b(1000), c(2000)]; slot 1 sits between them.
    expect(positionForMove(list, "a", 1)).toBe(1500);
  });

  it("excludes the moved item from its own neighbours", () => {
    // Without exclusion this would compute against b itself and misplace it.
    expect(positionForMove(list, "b", 1)).toBe(1000);
  });

  it("clamps an out-of-range index instead of throwing", () => {
    expect(positionForMove(list, "a", 99)).toBe(3000);
    expect(positionForMove(list, "a", -5)).toBe(1000 - POSITION_STEP);
  });

  it("handles a single-item list", () => {
    expect(positionForMove([{ id: "a", position: 0 }], "a", 0)).toBe(0);
  });
});

describe("renumber", () => {
  it("respaces a list evenly", () => {
    const out = renumber([{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(out.map((o) => o.position)).toEqual([0, 1000, 2000]);
  });

  it("returns an empty list unchanged", () => {
    expect(renumber([])).toEqual([]);
  });
});
