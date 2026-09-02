/**
 * Maps ISO dates (YYYY-MM-DD) onto a 0–100% horizontal track.
 *
 * Kept free of React so the arithmetic — the part most likely to regress — can
 * be unit-tested directly.
 */

const DAY_MS = 86_400_000;
/** Slack added at both ends so bars never touch the track edge. */
const PAD_RATIO = 0.1;
/** Span used when every milestone lands on the same day. */
const MIN_SPAN_DAYS = 7;

export interface TimelineScale {
  startMs: number;
  endMs: number;
  /** Percentage offset (0–100) for a date. Clamped to the track. */
  toPct: (iso: string) => number;
  /** Tick marks for the axis, one per month boundary in range. */
  ticks: { label: string; pct: number }[];
}

export function parseISODate(iso: string): number {
  // Midday avoids the date shifting under timezone offsets.
  return new Date(`${iso}T12:00:00`).getTime();
}

export function buildTimelineScale(dates: string[]): TimelineScale {
  const valid = dates.map(parseISODate).filter((t) => Number.isFinite(t));

  let min: number;
  let max: number;
  if (valid.length === 0) {
    const now = Date.now();
    min = now;
    max = now + MIN_SPAN_DAYS * DAY_MS;
  } else {
    min = Math.min(...valid);
    max = Math.max(...valid);
    if (max - min < MIN_SPAN_DAYS * DAY_MS) {
      const centre = (min + max) / 2;
      min = centre - (MIN_SPAN_DAYS / 2) * DAY_MS;
      max = centre + (MIN_SPAN_DAYS / 2) * DAY_MS;
    }
  }

  const pad = (max - min) * PAD_RATIO;
  const startMs = min - pad;
  const endMs = max + pad;
  const span = endMs - startMs;

  const toPct = (iso: string) => {
    const t = parseISODate(iso);
    if (!Number.isFinite(t)) return 0;
    return Math.min(100, Math.max(0, ((t - startMs) / span) * 100));
  };

  return { startMs, endMs, toPct, ticks: buildTicks(startMs, endMs) };
}

function buildTicks(startMs: number, endMs: number) {
  const ticks: { label: string; pct: number }[] = [];
  const span = endMs - startMs;
  const cursor = new Date(startMs);
  cursor.setDate(1);
  cursor.setHours(12, 0, 0, 0);
  // Step month by month; a long range would otherwise produce unreadable labels.
  while (cursor.getTime() <= endMs) {
    const t = cursor.getTime();
    if (t >= startMs) {
      ticks.push({
        label: cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        pct: ((t - startMs) / span) * 100,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

/** Shifts an ISO date by whole days, returning ISO. */
export function shiftISODate(iso: string, days: number): string {
  const d = new Date(parseISODate(iso) + days * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b) - parseISODate(a)) / DAY_MS);
}
