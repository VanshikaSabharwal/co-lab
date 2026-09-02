"use client";

import React, { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
import type { Connection, EdgeTypes, NodeTypes } from "@xyflow/react";
import { useWorkspaceBoard } from "../../lib/useWorkspaceBoard";
import WorkspaceCanvas from "../../components/WorkspaceCanvas";
import TableNode, { type ColumnDef } from "./TableNode";
import RelationEdge from "./RelationEdge";
import { CARDINALITIES, inferCardinality } from "./cardinality";

interface DbSchemaProps {
  groupId: string;
}

const NODE_TYPES: NodeTypes = { table: TableNode };
const EDGE_TYPES: EdgeTypes = { relation: RelationEdge };

export default function DbSchema({ groupId }: DbSchemaProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const {
    nodes,
    edges,
    presence,
    isOffline,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    updateEdgeLabel,
  } = useWorkspaceBoard({ groupId, type: "DB_SCHEMA", slug: "db-schema", userId });

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const columns = (n.data?.columns as ColumnDef[]) ?? [];
        return {
          ...n,
          // Backfill for tables persisted before the drag handle existed —
          // without this they'd stay unmovable after the fix.
          dragHandle: n.dragHandle ?? ".table-drag-handle",
          data: {
            ...n.data,
            onRenameTable: (tableName: string) => updateNodeData(n.id, { tableName }),
            onAddColumn: () =>
              updateNodeData(n.id, {
                columns: [...columns, { id: uuid(), name: "column", type: "string" }],
              }),
            onUpdateColumn: (columnId: string, patch: Partial<ColumnDef>) =>
              updateNodeData(n.id, {
                columns: columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
              }),
            onRemoveColumn: (columnId: string) =>
              updateNodeData(n.id, { columns: columns.filter((c) => c.id !== columnId) }),
          },
        };
      }),
    [nodes, updateNodeData],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        // The label is derived from the connected columns' keys, so toggling a
        // primary key re-labels every attached relation. A label the user set
        // by hand is kept as an explicit override.
        const inferred = inferCardinality(e, nodes);
        const isOverridden = typeof e.label === "string" && e.label !== "";
        return {
          ...e,
          type: "relation",
          label: isOverridden ? e.label : inferred,
          data: {
            isOverridden,
            onCycleLabel: (edgeId: string) => {
              const current = edges.find((edge) => edge.id === edgeId);
              const shown = (current?.label as string) || inferred;
              const idx = CARDINALITIES.indexOf(shown as (typeof CARDINALITIES)[number]);
              // Cycling past the end clears the override and hands the edge
              // back to inference.
              const next = idx === CARDINALITIES.length - 1 ? "" : CARDINALITIES[idx + 1]!;
              updateEdgeLabel(edgeId, next);
            },
            onResetLabel: (edgeId: string) => updateEdgeLabel(edgeId, ""),
          },
        };
      }),
    [edges, nodes, updateEdgeLabel],
  );

  const handleAddTable = () => {
    addNode({
      id: uuid(),
      type: "table",
      position: { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
      // Restricts dragging to the header grip. Without this the node's nodrag
      // inputs cover its whole surface and it cannot be moved at all.
      dragHandle: ".table-drag-handle",
      data: {
        tableName: "new_table",
        columns: [{ id: uuid(), name: "id", type: "string", isPrimaryKey: true }],
      },
    });
  };

  // Stamp the relation type at creation time — otherwise a freshly drawn edge
  // renders with the default edge type until the board is reloaded. No label is
  // set: an empty label means "infer from the connected columns".
  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect({ ...connection, type: "relation", label: "" });
    },
    [onConnect],
  );

  return (
    <WorkspaceCanvas
      groupId={groupId}
      title="DB Schema Design"
      nodes={displayNodes}
      edges={displayEdges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      presence={presence}
      currentUserId={userId}
      isOffline={isOffline}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      toolbar={
        <button
          onClick={handleAddTable}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          <Plus size={14} />
          Add table
        </button>
      }
    />
  );
}
