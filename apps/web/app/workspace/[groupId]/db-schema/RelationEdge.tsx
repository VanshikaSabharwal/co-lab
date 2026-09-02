"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { useTheme } from "next-themes";

export interface RelationEdgeData {
  onCycleLabel: (edgeId: string) => void;
  onResetLabel: (edgeId: string) => void;
  /** False while the label is derived from the connected columns' keys. */
  isOverridden?: boolean;
}

export default function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const d = data as unknown as RelationEdgeData | undefined;
  const { resolvedTheme } = useTheme();
  // The default light blue washes out on a white canvas.
  const stroke = resolvedTheme === "light" ? "#2563eb" : "#60a5fa";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke }} />
      <EdgeLabelRenderer>
        <button
          onClick={() => d?.onCycleLabel(id)}
          onDoubleClick={() => d?.onResetLabel(id)}
          title={
            d?.isOverridden
              ? "Set manually — click to change, double-click to derive from keys"
              : "Derived from the connected columns' primary keys — click to override"
          }
          className={`nodrag nopan absolute rounded border px-1.5 py-0.5 text-[10px] ${
            d?.isOverridden
              ? "border-blue-500/50 bg-white text-blue-700 dark:border-blue-600/50 dark:bg-gray-800 dark:text-blue-300"
              : "border-dashed border-gray-400/60 bg-white text-gray-600 dark:border-gray-500/60 dark:bg-gray-800 dark:text-gray-300"
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {label as string}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
