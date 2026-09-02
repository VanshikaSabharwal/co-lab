/**
 * Position arithmetic for drag-and-drop reordering.
 *
 * Rows carry gapped integer positions, so dropping between two neighbours only
 * writes the moved row — its siblings keep their positions. Kept pure and
 * separate so the edge cases (first slot, last slot, exhausted gap) are
 * testable without a DOM.
 */

export const POSITION_STEP = 1000;

/**
 * Position for a row dropped between `before` and `after` (either may be
 * undefined at the ends of a list).
 *
 * Returns null when there's no integer left between the neighbours — the
 * caller must then renumber the list. With a step of 1000 that needs ~10
 * consecutive drops into the same gap, but it is reachable, and silently
 * colliding positions would corrupt the order.
 */
export function positionBetween(before?: number, after?: number): number | null {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - POSITION_STEP;
  if (after === undefined) return before + POSITION_STEP;

  const gap = after - before;
  if (gap <= 1) return null;
  return before + Math.floor(gap / 2);
}

/** Evenly spaced positions for a list that ran out of gaps. */
export function renumber<T>(items: T[]): { item: T; position: number }[] {
  return items.map((item, i) => ({ item, position: i * POSITION_STEP }));
}

/**
 * Position for moving `movedId` to `toIndex` within `ordered`.
 *
 * `toIndex` is the index in the list *without* the moved item, which is how
 * both dnd-kit and a Gantt drop report a target slot.
 */
export function positionForMove<T extends { id: string; position: number }>(
  ordered: T[],
  movedId: string,
  toIndex: number,
): number | null {
  const without = ordered.filter((item) => item.id !== movedId);
  const clamped = Math.max(0, Math.min(toIndex, without.length));
  return positionBetween(without[clamped - 1]?.position, without[clamped]?.position);
}
