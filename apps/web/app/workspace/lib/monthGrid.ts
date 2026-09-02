/**
 * Day-column geometry for the timeline.
 *
 * The Gantt pins its domain to one visible month rather than auto-fitting the
 * data, so bars stay a consistent width as you page through months. Pure, so
 * the clipping arithmetic is testable without a DOM.
 */

export interface MonthGrid {
  year: number;
  /** 0-indexed, matching Date. */
  month: number;
  days: string[];
  label: string;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function buildMonthGrid(year: number, month: number): MonthGrid {
  const count = daysInMonth(year, month);
  return {
    year,
    month,
    days: Array.from({ length: count }, (_, i) => iso(year, month, i + 1)),
    label: new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export interface BarSpan {
  /** 0-based index of the first visible day column. */
  startIndex: number;
  /** Number of day columns the bar covers. */
  span: number;
  /** True when the task begins before this month. */
  clippedStart: boolean;
  /** True when it ends after this month. */
  clippedEnd: boolean;
}

/**
 * Where a task's bar sits in the visible month, or null if it doesn't overlap.
 *
 * A task spanning a month boundary is clipped to the visible range and flagged,
 * so the UI can show it continues rather than implying it ends at the edge.
 */
export function barSpanFor(
  grid: MonthGrid,
  startDate: string | null,
  dueDate: string | null,
): BarSpan | null {
  // With only one date the task is a single-day marker.
  const start = startDate ?? dueDate;
  const end = dueDate ?? startDate;
  if (!start || !end) return null;

  const first = grid.days[0]!;
  const last = grid.days[grid.days.length - 1]!;

  // Entirely outside the visible month.
  if (end < first || start > last) return null;

  const clampedStart = start < first ? first : start;
  const clampedEnd = end > last ? last : end;

  const startIndex = grid.days.indexOf(clampedStart);
  const endIndex = grid.days.indexOf(clampedEnd);
  if (startIndex === -1 || endIndex === -1) return null;

  return {
    startIndex,
    span: endIndex - startIndex + 1,
    clippedStart: start < first,
    clippedEnd: end > last,
  };
}

/** Index of today's column, or -1 when today isn't in this month. */
export function todayIndex(grid: MonthGrid, today = new Date()): number {
  return grid.days.indexOf(today.toISOString().slice(0, 10));
}
