"use client";

import React from "react";
import type { Node } from "@xyflow/react";
import { Copy, Trash2, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import type { UiPrimitiveData } from "./UiPrimitiveNode";

interface PropertiesPanelProps {
  node: Node | null;
  onPatchData: (id: string, data: Record<string, unknown>) => void;
  onPatchNode: (id: string, patch: Partial<Node>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
      <span>{label}</span>
      {children}
    </div>
  );
}

const inputCls =
  "w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-xs text-gray-200 outline-none focus:border-blue-600";

export default function PropertiesPanel({
  node,
  onPatchData,
  onPatchNode,
  onDuplicate,
  onDelete,
}: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="w-52 shrink-0 border-l border-gray-700/50 bg-gray-800/80 p-3">
        <p className="text-xs text-gray-500">
          Select an element to edit its properties.
        </p>
      </div>
    );
  }

  const d = node.data as unknown as UiPrimitiveData;
  const width = Math.round((node.style?.width as number) ?? node.measured?.width ?? 0);
  const height = Math.round((node.style?.height as number) ?? node.measured?.height ?? 0);

  return (
    <div className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-l border-gray-700/50 bg-gray-800/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {d.kind}
      </p>

      <Row label="Label">
        <input
          value={d.label ?? ""}
          onChange={(e) => onPatchData(node.id, { label: e.target.value })}
          className={`${inputCls} w-28 text-left`}
        />
      </Row>

      <Row label="Fill">
        <span className="flex items-center gap-1.5">
          <input
            type="color"
            value={d.fill || "#1f2937"}
            onChange={(e) => onPatchData(node.id, { fill: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border border-gray-700 bg-transparent"
          />
          {d.fill && (
            <button
              onClick={() => onPatchData(node.id, { fill: undefined })}
              className="text-[10px] text-gray-500 hover:text-gray-300"
              title="Reset to default fill"
            >
              reset
            </button>
          )}
        </span>
      </Row>

      <Row label="Radius">
        <input
          type="number"
          min={0}
          max={64}
          value={d.radius ?? ""}
          placeholder="—"
          onChange={(e) =>
            onPatchData(node.id, { radius: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          className={inputCls}
        />
      </Row>

      <Row label="Text size">
        <input
          type="number"
          min={8}
          max={72}
          value={d.fontSize ?? ""}
          placeholder="—"
          onChange={(e) =>
            onPatchData(node.id, { fontSize: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          className={inputCls}
        />
      </Row>

      <Row label={`Opacity ${d.opacity ?? 100}%`}>
        <input
          type="range"
          min={10}
          max={100}
          value={d.opacity ?? 100}
          onChange={(e) => onPatchData(node.id, { opacity: Number(e.target.value) })}
          className="w-20 accent-blue-600"
        />
      </Row>

      <Row label="Size">
        <span className="font-mono text-[11px] text-gray-300">
          {width} × {height}
        </span>
      </Row>

      <Row label="Layer">
        <span className="flex gap-1">
          <button
            onClick={() => onPatchNode(node.id, { zIndex: (node.zIndex ?? 0) + 1 })}
            className="rounded border border-gray-700 p-1 text-gray-400 hover:text-white"
            title="Bring forward"
          >
            <ArrowUpToLine size={13} />
          </button>
          <button
            onClick={() => onPatchNode(node.id, { zIndex: (node.zIndex ?? 0) - 1 })}
            className="rounded border border-gray-700 p-1 text-gray-400 hover:text-white"
            title="Send backward"
          >
            <ArrowDownToLine size={13} />
          </button>
        </span>
      </Row>

      <div className="mt-2 flex gap-2 border-t border-gray-700/50 pt-3">
        <button
          onClick={onDuplicate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-gray-700 py-1.5 text-xs text-gray-300 hover:border-blue-600/60 hover:text-white"
        >
          <Copy size={12} /> Duplicate
        </button>
        <button
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-gray-700 py-1.5 text-xs text-red-400 hover:border-red-600/60 hover:text-red-300"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>

      <p className="text-[10px] leading-relaxed text-gray-600">
        Ctrl+D duplicate · arrows nudge · Shift+drag multi-select
      </p>
    </div>
  );
}
