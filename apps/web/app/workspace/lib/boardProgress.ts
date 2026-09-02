/**
 * Board completion, derived from where tasks sit.
 *
 * Uses the same "done column" rule as the milestone progress helper, so the
 * two figures can never disagree about what counts as finished.
 */

const DONE_PATTERN = /done|complete|shipped/i;

export interface ProgressColumn {
  id: string;
  title: string;
}

/**
 * The column that means "finished": the first whose title matches, else the
 * last column — boards conventionally put done on the right.
 */
export function findDoneColumn<T extends ProgressColumn>(columns: T[]): T | null {
  if (columns.length === 0) return null;
  return columns.find((c) => DONE_PATTERN.test(c.title)) ?? columns[columns.length - 1]!;
}

/**
 * Fraction of tasks that have reached the done column, or null when there are
 * no tasks — so "nothing to do" is distinguishable from "nothing done".
 */
export function boardProgress(
  columns: ProgressColumn[],
  tasks: { columnId: string }[],
): number | null {
  if (tasks.length === 0) return null;
  const done = findDoneColumn(columns);
  if (!done) return null;
  return tasks.filter((t) => t.columnId === done.id).length / tasks.length;
}
