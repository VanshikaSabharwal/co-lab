import { describe, it, expect } from "vitest";
import {
  buildTimelineScale,
  daysBetween,
  shiftISODate,
} from "../../app/workspace/lib/timelineScale";

describe("buildTimelineScale", () => {
  it("places the earliest and latest dates inside the padded track", () => {
    const scale = buildTimelineScale(["2026-01-01", "2026-12-31"]);
    // Padding means neither end sits flush against 0% or 100%.
    expect(scale.toPct("2026-01-01")).toBeGreaterThan(0);
    expect(scale.toPct("2026-12-31")).toBeLessThan(100);
    expect(scale.toPct("2026-01-01")).toBeLessThan(scale.toPct("2026-12-31"));
  });

  it("puts the midpoint of the range at the centre of the track", () => {
    const scale = buildTimelineScale(["2026-01-01", "2026-01-31"]);
    expect(scale.toPct("2026-01-16")).toBeCloseTo(50, 0);
  });

  it("clamps dates outside the range rather than overflowing the track", () => {
    const scale = buildTimelineScale(["2026-06-01", "2026-06-30"]);
    expect(scale.toPct("2020-01-01")).toBe(0);
    expect(scale.toPct("2030-01-01")).toBe(100);
  });

  it("gives a usable span when every milestone is on the same day", () => {
    const scale = buildTimelineScale(["2026-03-10", "2026-03-10"]);
    expect(scale.endMs).toBeGreaterThan(scale.startMs);
    expect(scale.toPct("2026-03-10")).toBeCloseTo(50, 0);
  });

  it("handles an empty list without producing NaN", () => {
    const scale = buildTimelineScale([]);
    expect(Number.isFinite(scale.startMs)).toBe(true);
    expect(Number.isFinite(scale.toPct("2026-01-01"))).toBe(true);
  });

  it("emits month ticks in ascending order", () => {
    const { ticks } = buildTimelineScale(["2026-01-15", "2026-04-15"]);
    expect(ticks.length).toBeGreaterThan(0);
    const pcts = ticks.map((t) => t.pct);
    expect([...pcts].sort((a, b) => a - b)).toEqual(pcts);
  });
});

describe("date arithmetic", () => {
  it("shifts dates across a month boundary", () => {
    expect(shiftISODate("2026-01-30", 3)).toBe("2026-02-02");
    expect(shiftISODate("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("survives a leap day", () => {
    expect(shiftISODate("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("counts whole days between dates, signed", () => {
    expect(daysBetween("2026-01-01", "2026-01-08")).toBe(7);
    expect(daysBetween("2026-01-08", "2026-01-01")).toBe(-7);
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("round-trips a shift", () => {
    const start = "2026-07-04";
    const moved = shiftISODate(start, 45);
    expect(daysBetween(start, moved)).toBe(45);
  });
});
