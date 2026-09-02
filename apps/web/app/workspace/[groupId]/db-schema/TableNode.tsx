"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GripVertical, Key, Plus, Trash2 } from "lucide-react";

export interface ColumnDef {
  id: string;
  name: string;
  type: string;
  isPrimaryKey?: boolean;
}

export interface TableNodeData {
  tableName: string;
  columns: ColumnDef[];
  onRenameTable: (name: string) => void;
  onAddColumn: () => void;
  onUpdateColumn: (columnId: string, patch: Partial<ColumnDef>) => void;
  onRemoveColumn: (columnId: string) => void;
}

export default function TableNode({ data }: NodeProps) {
  const d = data as unknown as TableNodeData;

  return (
    <div className="w-64 rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 md:w-60">
      {/* Table-level handles. Explicit ids so onConnect receives a real
          sourceHandle/targetHandle, and sized well above the 6px default so
          they can actually be grabbed — especially by touch. */}
      <Handle
        id="table-l"
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-blue-500 dark:!border-gray-900"
      />
      <Handle
        id="table-r"
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-blue-500 dark:!border-gray-900"
      />

      {/* The whole header is the drag surface. The node sets dragHandle to this
          class, so React Flow ignores the `nodrag` children entirely — without
          it the nodrag inputs below cover the node and leave nothing to grab. */}
      <div className="table-drag-handle flex cursor-grab items-center gap-1.5 rounded-t-md border-b border-gray-200 bg-gray-100 px-2 py-2 active:cursor-grabbing dark:border-gray-700 dark:bg-gray-700/60">
        <GripVertical size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
        <input
          value={d.tableName}
          onChange={(e) => d.onRenameTable(e.target.value)}
          className="nodrag w-full bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
          placeholder="table_name"
        />
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700/60">
        {d.columns.map((col) => (
          <div key={col.id} className="relative flex items-center gap-1 px-2 py-2 md:py-1">
            {/* Per-column handles let a relation point at a specific FK column
                rather than the whole table. */}
            <Handle
              id={`col-${col.id}-l`}
              type="target"
              position={Position.Left}
              className="!h-2.5 !w-2.5 !border !border-white !bg-blue-400/70 dark:!border-gray-900"
            />
            <button
              onClick={() => d.onUpdateColumn(col.id, { isPrimaryKey: !col.isPrimaryKey })}
              title="Primary key"
              className={`nodrag p-1.5 ${col.isPrimaryKey ? "text-amber-500 dark:text-amber-400" : "text-gray-400 dark:text-gray-600"}`}
            >
              <Key size={16} className="md:h-3 md:w-3" />
            </button>
            <input
              value={col.name}
              onChange={(e) => d.onUpdateColumn(col.id, { name: e.target.value })}
              className="nodrag w-20 flex-1 bg-transparent text-xs text-gray-700 outline-none dark:text-gray-200"
              placeholder="column"
            />
            <input
              value={col.type}
              onChange={(e) => d.onUpdateColumn(col.id, { type: e.target.value })}
              className="nodrag w-14 bg-transparent text-right text-xs text-gray-500 outline-none dark:text-gray-500"
              placeholder="type"
            />
            <button
              onClick={() => d.onRemoveColumn(col.id)}
              className="nodrag p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
            >
              <Trash2 size={16} className="md:h-3 md:w-3" />
            </button>
            <Handle
              id={`col-${col.id}-r`}
              type="source"
              position={Position.Right}
              className="!h-2.5 !w-2.5 !border !border-white !bg-blue-400/70 dark:!border-gray-900"
            />
          </div>
        ))}
      </div>

      <button
        onClick={d.onAddColumn}
        className="nodrag flex w-full items-center justify-center gap-1 rounded-b-md border-t border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700/60 dark:text-gray-400 dark:hover:bg-gray-700/40 dark:hover:text-white md:py-1.5"
      >
        <Plus size={12} /> Add column
      </button>
    </div>
  );
}
