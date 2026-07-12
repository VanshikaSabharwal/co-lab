"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

export interface RelationEdgeData {
  onCycleLabel: (edgeId: string) => void;
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

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: "#60a5fa" }} />
      <EdgeLabelRenderer>
        <button
          onClick={() => d?.onCycleLabel(id)}
          className="nodrag nopan absolute rounded border border-blue-600/50 bg-gray-800 px-1.5 py-0.5 text-[10px] text-blue-300"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {(label as string) || "1-1"}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
