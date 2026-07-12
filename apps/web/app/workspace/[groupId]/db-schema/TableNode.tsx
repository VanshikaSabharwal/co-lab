"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Plus, Trash2 } from "lucide-react";

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
    <div className="w-60 rounded-md border border-gray-600 bg-gray-800 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />

      <div className="border-b border-gray-700 bg-gray-700/60 px-3 py-2">
        <input
          value={d.tableName}
          onChange={(e) => d.onRenameTable(e.target.value)}
          className="nodrag w-full bg-transparent text-sm font-semibold text-white outline-none"
          placeholder="table_name"
        />
      </div>

      <div className="divide-y divide-gray-700/60">
        {d.columns.map((col) => (
          <div key={col.id} className="flex items-center gap-1 px-2 py-1">
            <button
              onClick={() => d.onUpdateColumn(col.id, { isPrimaryKey: !col.isPrimaryKey })}
              title="Primary key"
              className={`nodrag ${col.isPrimaryKey ? "text-amber-400" : "text-gray-600"}`}
            >
              <Key size={12} />
            </button>
            <input
              value={col.name}
              onChange={(e) => d.onUpdateColumn(col.id, { name: e.target.value })}
              className="nodrag w-20 flex-1 bg-transparent text-xs text-gray-200 outline-none"
              placeholder="column"
            />
            <input
              value={col.type}
              onChange={(e) => d.onUpdateColumn(col.id, { type: e.target.value })}
              className="nodrag w-14 bg-transparent text-right text-xs text-gray-500 outline-none"
              placeholder="type"
            />
            <button
              onClick={() => d.onRemoveColumn(col.id)}
              className="nodrag text-gray-600 hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={d.onAddColumn}
        className="nodrag flex w-full items-center justify-center gap-1 border-t border-gray-700/60 py-1.5 text-xs text-gray-400 hover:bg-gray-700/40 hover:text-white"
      >
        <Plus size={12} /> Add column
      </button>
    </div>
  );
}
