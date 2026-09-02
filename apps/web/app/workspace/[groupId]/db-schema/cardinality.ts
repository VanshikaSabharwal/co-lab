import type { Edge, Node } from "@xyflow/react";
import type { ColumnDef } from "./TableNode";

export const CARDINALITIES = ["1-1", "1-many", "many-1", "many-many"] as const;
export type Cardinality = (typeof CARDINALITIES)[number];

/**
 * Handles are `col-<columnId>-l` / `col-<columnId>-r` for per-column endpoints
 * and `table-l` / `table-r` for the whole-table ones. Only the former identify
 * a column we can inspect for a primary key.
 */
function columnIdFromHandle(handleId: string | null | undefined): string | null {
  if (!handleId) return null;
  const match = /^col-(.+)-[lr]$/.exec(handleId);
  return match?.[1] ?? null;
}

/**
 * An endpoint is "unique" when it lands on a primary-key column. A table-level
 * handle (or a column we can't resolve) is treated as non-unique — that side
 * can hold many matching rows, which is the safe read for a foreign key.
 */
function isUniqueEndpoint(
  nodes: Node[],
  nodeId: string | null | undefined,
  handleId: string | null | undefined,
): boolean {
  const columnId = columnIdFromHandle(handleId);
  if (!columnId) return false;
  const columns = (nodes.find((n) => n.id === nodeId)?.data?.columns as ColumnDef[]) ?? [];
  return columns.find((c) => c.id === columnId)?.isPrimaryKey === true;
}

/**
 * Derives the relation's cardinality from the columns it connects, so toggling
 * a primary key updates every attached edge instead of leaving a stale label.
 */
export function inferCardinality(edge: Edge, nodes: Node[]): Cardinality {
  const sourceUnique = isUniqueEndpoint(nodes, edge.source, edge.sourceHandle);
  const targetUnique = isUniqueEndpoint(nodes, edge.target, edge.targetHandle);

  if (sourceUnique && targetUnique) return "1-1";
  if (sourceUnique) return "1-many";
  if (targetUnique) return "many-1";
  return "many-many";
}
