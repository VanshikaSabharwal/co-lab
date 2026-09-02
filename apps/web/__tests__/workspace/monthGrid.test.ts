import { describe, it, expect } from "vitest";
import {
  barSpanFor,
  buildMonthGrid,
  daysInMonth,
  shiftMonth,
  todayIndex,
} from "../../app/workspace/lib/monthGrid";

const sep = buildMonthGrid(2026, 8); // September 2026, 30 days

describe("buildMonthGrid", () => {
  it("emits one ISO date per day", () => {
    expect(sep.days).toHaveLength(30);
    expect(sep.days[0]).toBe("2026-09-01");
    expect(sep.days[29]).toBe("2026-09-30");
  });

  it("zero-pads single-digit months and days", () => {
    expect(buildMonthGrid(2026, 0).days[0]).toBe("2026-01-01");
  });

  it("handles leap and non-leap February", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
  });
});

describe("shiftMonth", () => {
  it("rolls forward across a year boundary", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("rolls backward across a year boundary", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("shifts by more than a year", () => {
    expect(shiftMonth(2026, 5, 13)).toEqual({ year: 2027, month: 6 });
  });
});

describe("barSpanFor", () => {
  it("places a bar fully inside the month", () => {
    expect(barSpanFor(sep, "2026-09-05", "2026-09-09")).toEqual({
      startIndex: 4,
      span: 5,
      clippedStart: false,
      clippedEnd: false,
    });
  });

  it("treats a single date as a one-day marker", () => {
    expect(barSpanFor(sep, null, "2026-09-10")).toMatchObject({ startIndex: 9, span: 1 });
    expect(barSpanFor(sep, "2026-09-10", null)).toMatchObject({ startIndex: 9, span: 1 });
  });

  it("clips a bar that starts before the month and flags it", () => {
    const span = barSpanFor(sep, "2026-08-20", "2026-09-03");
    expect(span).toMatchObject({ startIndex: 0, span: 3, clippedStart: true, clippedEnd: false });
  });

  it("clips a bar that ends after the month and flags it", () => {
    const span = barSpanFor(sep, "2026-09-28", "2026-10-15");
    expect(span).toMatchObject({ startIndex: 27, span: 3, clippedStart: false, clippedEnd: true });
  });

  it("spans the whole month when it covers both edges", () => {
    const span = barSpanFor(sep, "2026-01-01", "2026-12-31");
    expect(span).toMatchObject({ startIndex: 0, span: 30, clippedStart: true, clippedEnd: true });
  });

  it("returns null for a task entirely outside the month", () => {
    expect(barSpanFor(sep, "2026-07-01", "2026-07-10")).toBeNull();
    expect(barSpanFor(sep, "2026-11-01", "2026-11-10")).toBeNull();
  });

  it("returns null when the task has no dates", () => {
    expect(barSpanFor(sep, null, null)).toBeNull();
  });

  it("includes a bar touching only the first or last day", () => {
    expect(barSpanFor(sep, "2026-08-01", "2026-09-01")).toMatchObject({ startIndex: 0, span: 1 });
    expect(barSpanFor(sep, "2026-09-30", "2026-10-31")).toMatchObject({ startIndex: 29, span: 1 });
  });
});

describe("todayIndex", () => {
  it("finds today when it falls in the month", () => {
    expect(todayIndex(sep, new Date("2026-09-15T12:00:00Z"))).toBe(14);
  });

  it("returns -1 when today is elsewhere", () => {
    expect(todayIndex(sep, new Date("2026-10-15T12:00:00Z"))).toBe(-1);
  });
});
