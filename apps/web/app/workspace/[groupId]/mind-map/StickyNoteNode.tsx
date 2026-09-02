"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export const STICKY_COLORS = ["yellow", "blue", "green", "pink"] as const;
export type StickyColor = (typeof STICKY_COLORS)[number];

const COLOR_CLASSES: Record<StickyColor, string> = {
  yellow: "bg-yellow-200 border-yellow-400 text-yellow-950",
  blue: "bg-blue-200 border-blue-400 text-blue-950",
  green: "bg-green-200 border-green-400 text-green-950",
  pink: "bg-pink-200 border-pink-400 text-pink-950",
};

export interface StickyNoteData {
  label: string;
  color: StickyColor;
  onChange: (value: string) => void;
  onColorChange: (color: StickyColor) => void;
}

export default function StickyNoteNode({ data }: NodeProps) {
  const d = data as unknown as StickyNoteData;
  const colorClass = COLOR_CLASSES[d.color] ?? COLOR_CLASSES.yellow;

  return (
    <div className={`w-44 rounded-md border-2 p-2 shadow-md ${colorClass}`}>
      <Handle type="target" position={Position.Top} />
      <textarea
        className="h-20 w-full resize-none bg-transparent text-sm outline-none"
        value={d.label}
        onChange={(e) => d.onChange(e.target.value)}
        placeholder="Type an idea…"
      />
      <div className="mt-1 flex gap-1">
        {STICKY_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => d.onColorChange(c)}
            className={`h-4 w-4 rounded-full border ${COLOR_CLASSES[c]} ${c === d.color ? "ring-2 ring-gray-500 dark:ring-gray-800" : ""}`}
            aria-label={`Set color ${c}`}
          />
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
